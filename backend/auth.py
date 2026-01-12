from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import logging
import models
from database import get_db
from ldap3 import Server, Connection, ALL

# Router tanımla
router = APIRouter()

# Logger setup
logger = logging.getLogger(__name__)

# LDAP ayarları
LDAP_SERVER = f"ldap://{os.getenv('LDAP_HOST', 'tesmer.local')}:{os.getenv('LDAP_PORT', '389')}"
LDAP_BASE_DN = os.getenv("LDAP_BASE_DN", "OU=TesmerUser,DC=tesmer,DC=local")
LDAP_BIND_DN = os.getenv("LDAP_BIND_DN", "CN=Ldap reader,OU=TesmerUser,DC=tesmer,DC=local")
LDAP_BIND_PASSWORD = os.getenv("LDAP_BIND_PASSWORD", "S160682u*")

# JWT ayarları
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserInDB(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

# LDAP import'unu try-except ile sar
try:
    from ldap3 import Server, Connection, ALL
    LDAP_AVAILABLE = True
    print("LDAP module loaded successfully")
except ImportError as e:
    LDAP_AVAILABLE = False
    print(f"LDAP module not available: {e} - LDAP authentication disabled")

def authenticate_ldap(username: str, password: str):
    """LDAP authentication"""
    if not LDAP_AVAILABLE:
        logger.warning("LDAP not available - falling back to local auth")
        return None
        
    try:
        logger.info(f"LDAP authentication attempt for: {username}")
        
        # LDAP sunucu bağlantısı - DOĞRU HOST
        server = Server('ldap://tesmer.local:389', get_info=ALL, connect_timeout=10)
        
        # DOĞRU BIND DN
        bind_dn = "CN=Ldap reader,OU=TesmerUser,DC=tesmer,DC=local"
        bind_password = "S160682u*"
        
        logger.info(f"Connecting to LDAP server with bind DN: {bind_dn}")
        
        # Bağlantıyı manuel olarak kur
        conn = Connection(server, bind_dn, bind_password, auto_bind=False)
        
        # Bind işlemini yap
        bind_result = conn.bind()
        if not bind_result:
            logger.error(f"LDAP bind failed: {conn.result}")
            return None
            
        logger.info("LDAP bind successful")
        
        # Kullanıcıyı ara - DOĞRU BASE DN
        search_filter = f"(sAMAccountName={username})"
        conn.search('DC=tesmer,DC=local', search_filter, attributes=['cn', 'mail', 'sAMAccountName'])
        
        if len(conn.entries) == 0:
            logger.warning(f"User {username} not found in LDAP")
            conn.unbind()
            return None
        
        user_entry = conn.entries[0]
        user_dn = user_entry.entry_dn
        logger.info(f"Found user DN: {user_dn}")
        
        # İlk bağlantıyı kapat
        conn.unbind()
        
        # Kullanıcının şifresiyle bağlanmayı dene
        user_conn = Connection(server, user_dn, password)
        if user_conn.bind():
            logger.info(f"LDAP authentication successful for {username}")
            user_conn.unbind()
            return {
                'username': username,
                'full_name': str(user_entry.cn) if user_entry.cn else username,
                'email': str(user_entry.mail) if user_entry.mail else f"{username}@tesmer.local"
            }
        else:
            logger.warning(f"LDAP password incorrect for {username}")
            return None
            
    except Exception as e:
        logger.error(f"LDAP auth error for {username}: {str(e)}")
        return None

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    
    if not user:
        return False
    
    # Aktif olmayan kullanıcılar giriş yapamaz
    if not user.is_active:
        return False
    
    # LDAP kullanıcısı ise LDAP'tan auth yap
    if user.is_ldap:
        if authenticate_ldap(username, password):
            return user
        else:
            return False
    
    # Local kullanıcı ise hash kontrolü yap
    if not verify_password(password, user.hashed_password):
        return False
    
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)  # 24 saat token süresi
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def sync_ldap_users_func(db: Session):
    """LDAP'tan kullanıcıları çek ve departman bilgilerini düzelt - ŞIFRE SAKLAMA"""
    if not LDAP_AVAILABLE:
        logger.warning("LDAP not available - sync disabled")
        return {"success": False, "message": "LDAP module not available"}
        
    try:
        # LDAP bağlantısı kur - ldap3 kullan
        server = Server(LDAP_SERVER.replace('ldap://', '').replace(':389', ''), get_info=ALL, connect_timeout=10)
        conn = Connection(server, LDAP_BIND_DN, LDAP_BIND_PASSWORD)
        
        if not conn.bind():
            logger.error(f"LDAP bind failed: {conn.result}")
            return {"success": False, "message": "LDAP bağlantı hatası"}
        
        # Kullanıcıları ara
        search_filter = "(objectClass=person)"
        conn.search(LDAP_BASE_DN, search_filter, attributes=['sAMAccountName', 'mail', 'cn', 'department', 'departmentNumber', 'ou', 'userPrincipalName'])
        
        synced_count = 0
        departments_created = 0
        
        for entry in conn.entries:
            try:
                username = str(entry.sAMAccountName) if entry.sAMAccountName else ""
                email = str(entry.mail) if entry.mail else ""
                full_name = str(entry.cn) if entry.cn else ""
                ldap_department = str(entry.department) if entry.department else ""
                
                # Email yoksa userPrincipalName'den al
                if not email and entry.userPrincipalName:
                    email = str(entry.userPrincipalName)
                
                # Email hala yoksa username'den oluştur
                if not email:
                    email = f"{username}@tesmer.local"
                
                # Eğer department yoksa OU'dan al
                if not ldap_department:
                    dn_parts = entry.entry_dn.split(',')
                    for part in dn_parts:
                        if part.strip().startswith('OU=') and 'TesmerUser' not in part:
                            ldap_department = part.strip().replace('OU=', '')
                            break
                
                # Username boşsa atla
                if not username:
                    continue
                
                # Full name yoksa username kullan
                if not full_name:
                    full_name = username
                
                # Departman bilgisini bul veya oluştur
                department_id = None
                if ldap_department:
                    dept = db.query(models.Department).filter(
                        models.Department.name.ilike(f"%{ldap_department}%")
                    ).first()
                    
                    if not dept:
                        # Yeni departman oluştur
                        dept = models.Department(
                            name=ldap_department,
                            description=f"LDAP'tan otomatik oluşturuldu: {ldap_department}"
                        )
                        db.add(dept)
                        db.flush()  # ID'yi almak için flush
                        departments_created += 1
                    
                    department_id = dept.id
                
                # Kullanıcıyı bul veya oluştur
                user = db.query(models.User).filter(models.User.username == username).first()
                
                if user:
                    # Mevcut kullanıcıyı güncelle - ŞIFRE GÜNCELLEMEYİN
                    update_needed = False
                    
                    # Email güncellerken çakışma kontrolü
                    if email and user.email != email:
                        # Başka kullanıcıda aynı email var mı?
                        existing_email_user = db.query(models.User).filter(
                            models.User.email == email,
                            models.User.id != user.id
                        ).first()
                        
                        if existing_email_user:
                            logger.warning(
                                f"E-posta çakışması: {email} hem '{username}' hem de '{existing_email_user.username}' "
                                f"kullanıcılarında var. E-posta güncellenmedi."
                            )
                        else:
                            user.email = email
                            update_needed = True
                    
                    if user.full_name != full_name:
                        user.full_name = full_name
                        update_needed = True
                        
                    if user.department_id != department_id:
                        user.department_id = department_id
                        update_needed = True
                        
                    if not user.is_active:
                        user.is_active = True
                        update_needed = True
                    
                    if update_needed:
                        try:
                            db.commit()
                            logger.info(f"Kullanıcı güncellendi: {username} - {email}")
                            synced_count += 1
                        except Exception as commit_error:
                            logger.error(f"Kullanıcı güncellenirken hata: {username} - {commit_error}")
                            db.rollback()
                    else:
                        synced_count += 1
                else:
                    # Email çakışması kontrolü
                    if email:
                        existing_email_user = db.query(models.User).filter(
                            models.User.email == email
                        ).first()
                        
                        if existing_email_user:
                            logger.warning(
                                f"E-posta çakışması: {email} zaten '{existing_email_user.username}' "
                                f"kullanıcısında var. '{username}' için e-posta boş bırakılıyor."
                            )
                            email = f"{username}@tesmer.local"  # Fallback email
                    
                    # Yeni LDAP kullanıcı oluştur - ŞIFRE YOK
                    try:
                        user = models.User(
                            username=username,
                            email=email,
                            full_name=full_name,
                            department_id=department_id,
                            hashed_password="",  # LDAP kullanıcıları için şifre yok
                            is_ldap=True,
                            is_active=True,
                            is_admin=False
                        )
                        db.add(user)
                        db.commit()
                        db.refresh(user)
                        logger.info(f"Yeni kullanıcı oluşturuldu: {username} - {email}")
                        synced_count += 1
                    except Exception as create_error:
                        logger.error(f"Yeni kullanıcı oluşturulurken hata: {username} - {create_error}")
                        db.rollback()
                
            except Exception as user_error:
                logger.error(f"Kullanıcı senkron hatası: {user_error}")
                db.rollback()
                continue
        
        # Son bir commit gerekirse (departmanlar için)
        try:
            db.commit()
        except Exception as final_commit_error:
            logger.error(f"Final commit hatası: {final_commit_error}")
            db.rollback()
        
        conn.unbind()
        
        return {
            "success": True,
            "message": f"{synced_count} kullanıcı ve {departments_created} yeni departman senkronize edildi",
            "synced_count": synced_count,
            "departments_created": departments_created
        }
        
    except Exception as e:
        logger.error(f"LDAP sync error: {str(e)}")
        return {"success": False, "message": f"LDAP senkronizasyon hatası: {str(e)}"}

@router.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login endpoint - LDAP ve local kullanıcı desteği"""
    try:
        logger.info(f"Login attempt: {form_data.username}")
        
        # Admin kullanıcı kontrolü
        if form_data.username == "admin" and form_data.password == "admin":
            # Admin user'ı veritabanından bul
            user = db.query(models.User).filter(models.User.username == "admin").first()
            if not user:
                # Admin user yoksa oluştur
                logger.info("Admin user DB'de bulunamadı, oluşturuluyor...")
                from models import Department
                first_dept = db.query(Department).first()
                user = models.User(
                    username="admin",
                    email="admin@destek.com",
                    full_name="System Administrator",
                    hashed_password=get_password_hash("admin"),
                    is_admin=True,
                    is_ldap=False,
                    is_active=True,
                    department_id=first_dept.id if first_dept else None
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                logger.info(f"Admin user oluşturuldu: ID {user.id}")
            
            # Admin token oluştur ve gerçek veritabanı verilerini döndür
            access_token = create_access_token(data={"sub": "admin"})
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "is_admin": user.is_admin,
                    "is_active": user.is_active,
                    "email": user.email
                }
            }
        
        # Önce LDAP denemesi yap
        if LDAP_AVAILABLE:
            ldap_result = authenticate_ldap(form_data.username, form_data.password)
            if ldap_result:
                # LDAP kullanıcısını veritabanında bul veya oluştur
                user = db.query(models.User).filter(models.User.username == form_data.username).first()
                
                # Kullanıcı varsa ama aktif değilse hata ver
                if user and not user.is_active:
                    logger.warning(f"Inactive user login attempt: {form_data.username}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Kullanıcı hesabı aktif değil. Lütfen sistem yöneticisi ile iletişime geçin."
                    )
                
                if not user:
                    # Yeni LDAP kullanıcısı oluştur
                    user = models.User(
                        username=ldap_result['username'],
                        email=ldap_result['email'],
                        full_name=ldap_result['full_name'],
                        hashed_password="",  # LDAP kullanıcıları için şifre yok
                        is_ldap=True,
                        is_active=True,
                        is_admin=False
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    logger.info(f"Yeni LDAP kullanıcısı oluşturuldu: {user.username}")
                else:
                    # Mevcut kullanıcıyı güncelle
                    user.email = ldap_result['email']
                    user.full_name = ldap_result['full_name']
                    user.is_active = True
                    db.commit()
                    logger.info(f"LDAP kullanıcısı güncellendi: {user.username}")
                
                access_token = create_access_token(data={"sub": user.username})
                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "full_name": user.full_name,
                        "is_admin": getattr(user, 'is_admin', False),
                        "is_active": user.is_active,
                        "email": user.email
                    }
                }
        
        # Local kullanıcı authentication
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Kullanıcı adı veya şifre yanlış",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "is_admin": getattr(user, 'is_admin', False),
                "is_active": user.is_active,
                "email": getattr(user, 'email', f"{user.username}@sistem.com")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Giriş yapılamadı",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/users/me", response_model=UserInDB)
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)):
    return current_user
