from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
LDAP_HOST = os.getenv('LDAP_HOST') or os.getenv('LDAP_SERVER', 'tesmer.local')
LDAP_PORT = int(os.getenv('LDAP_PORT', '389'))
LDAP_SERVER = f"ldap://{LDAP_HOST}:{LDAP_PORT}"
LDAP_BASE_DN = os.getenv("LDAP_BASE_DN", "OU=TesmerUser,DC=tesmer,DC=local")
LDAP_BIND_DN = os.getenv("LDAP_BIND_DN") or os.getenv("LDAP_USERNAME", "CN=Ldap reader,OU=TesmerUser,DC=tesmer,DC=local")
LDAP_BIND_PASSWORD = os.getenv("LDAP_BIND_PASSWORD") or os.getenv("LDAP_PASSWORD", "S160682u*")

# JWT ayarları
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 saat

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
        
        # LDAP sunucu bağlantısı - environment variable'lardan oku
        ldap_host = os.getenv('LDAP_HOST', 'tesmer.local')
        ldap_port = int(os.getenv('LDAP_PORT', '389'))
        server = Server(f'ldap://{ldap_host}:{ldap_port}', get_info=ALL, connect_timeout=10)
        
        # BIND DN ve password - environment variable'lardan oku
        bind_dn = LDAP_BIND_DN
        bind_password = LDAP_BIND_PASSWORD
        
        logger.info(f"Connecting to LDAP server: {ldap_host}:{ldap_port} with bind DN: {bind_dn}")
        
        # Bağlantıyı manuel olarak kur
        conn = Connection(server, bind_dn, bind_password, auto_bind=False)
        
        # Bind işlemini yap
        bind_result = conn.bind()
        if not bind_result:
            logger.error(f"LDAP bind failed: {conn.result}")
            return None
            
        logger.info("LDAP bind successful")
        
        # BASE_DN'den domain'i çıkar (DC=tesmer,DC=local formatı için)
        search_base = LDAP_BASE_DN
        if 'DC=' in search_base:
            # DC kısmını bul (örn: OU=TesmerUser,DC=tesmer,DC=local -> DC=tesmer,DC=local)
            dc_parts = [part.strip() for part in search_base.split(',') if part.strip().startswith('DC=')]
            if dc_parts:
                search_base = ','.join(dc_parts)
        
        # Kullanıcıyı ara
        search_filter = f"(sAMAccountName={username})"
        logger.info(f"Searching for user in: {search_base}")
        conn.search(search_base, search_filter, attributes=['cn', 'mail', 'sAMAccountName'])
        
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
            
            # Email domain'i - LDAP'tan gelen mail varsa onu kullan, yoksa tesmer.org.tr
            # tesmer.local mail sunucuları tarafından reddediliyor
            ldap_email = str(user_entry.mail) if user_entry.mail else None
            
            # Eğer LDAP email'i tesmer.local ile bitiyorsa düzelt
            if ldap_email and ldap_email.endswith('@tesmer.local'):
                ldap_email = ldap_email.replace('@tesmer.local', '@tesmer.org.tr')
            
            return {
                'username': username,
                'full_name': str(user_entry.cn) if user_entry.cn else username,
                'email': ldap_email or f"{username}@tesmer.org.tr"
            }
        else:
            logger.warning(f"LDAP password incorrect for {username}")
            user_conn.unbind()
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
    
    # LDAP kullanıcısı ise SADECE LDAP'tan auth yap (yerel şifre fallback yapılamaz)
    if user.is_ldap:
        ldap_result = authenticate_ldap(username, password)
        if ldap_result:
            return user
        else:
            logger.warning(f"Strict LDAP authentication failed for user: {username}")
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

# Download endpointleri için opsiyonel OAuth2 (header veya query param token)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_current_user_for_download(
    header_token: Optional[str] = Depends(oauth2_scheme_optional),
    query_token: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
):
    """Download endpointleri için auth - header veya query param token destekler"""
    auth_token = header_token or query_token
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(auth_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    user = get_user(db, username=username)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    return user

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
                    
                    # ÖNEMLİ: Manuel olarak pasif yapılan kullanıcılar pasif kalmalı
                    # LDAP senkronizasyonu is_active durumunu değiştirmez
                    # if not user.is_active:
                    #     user.is_active = True
                    #     update_needed = True
                    
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
    from utils.system_logger import log_auth, LogAction
    
    try:
        logger.info(f"Login attempt: {form_data.username}")
        
        # 1. Kullanıcıyı DB'de ara
        user = db.query(models.User).filter(models.User.username == form_data.username).first()
        
        # 2. Eğer kullanıcı aktif değilse hemen reddet
        if user and not user.is_active:
            logger.warning(f"Inactive user login attempt: {form_data.username}")
            log_auth(db, LogAction.LOGIN_FAILED, user_id=user.id, username=form_data.username,
                    success=False, error_message="Hesap aktif değil",
                    details={"reason": "inactive_account"})
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kullanıcı hesabı aktif değil. Lütfen sistem yöneticisi ile iletişime geçin."
            )

        # 3. LDAP Kullanıcısı mı kontrol et veya Yeni LDAP Kaydı mı bak
        if (user and user.is_ldap) or (not user and LDAP_AVAILABLE):
            # LDAP doğrulaması dene
            ldap_result = authenticate_ldap(form_data.username, form_data.password)
            
            if ldap_result:
                if not user:
                    # Yeni LDAP kullanıcısı oluştur
                    user = models.User(
                        username=ldap_result['username'],
                        email=ldap_result.get('email', f"{ldap_result['username']}@tesmer.org.tr"),
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
                    # Mevcut LDAP kullanıcısını güncelle
                    user.email = ldap_result.get('email', f"{user.username}@tesmer.org.tr")
                    user.full_name = ldap_result['full_name']
                    # ÖNEMLİ: Pasif kullanıcılar login yapamaz zaten (yukarıda kontrol var)
                    # Bu yüzden is_active'i güncellemiyoruz
                    # user.is_active = True
                    db.commit()
                    logger.info(f"LDAP kullanıcısı doğrulandı ve güncellendi: {user.username}")
                
                # Başarılı login logu
                log_auth(db, LogAction.LOGIN, user_id=user.id, username=user.username,
                        success=True, details={"method": "ldap"})
                
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
            elif user and user.is_ldap:
                # LDAP kullanıcısı ama LDAP doğrulaması başarısız oldu
                logger.warning(f"Strict LDAP login failed for user: {form_data.username}")
                log_auth(db, LogAction.LOGIN_FAILED, user_id=user.id, username=form_data.username,
                        success=False, error_message="LDAP doğrulama başarısız",
                        details={"method": "ldap"})
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Kullanıcı adı veya şifre yanlış (LDAP)",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # 4. Yerel Kullanıcı Doğrulaması (Kullanıcı DB'de varsa ve is_ldap=False ise)
        if user and not user.is_ldap:
            if not verify_password(form_data.password, user.hashed_password):
                logger.warning(f"Local login failed: Password mismatch for user {form_data.username}")
                log_auth(db, LogAction.LOGIN_FAILED, user_id=user.id, username=form_data.username,
                        success=False, error_message="Şifre yanlış",
                        details={"method": "local"})
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Kullanıcı adı veya şifre yanlış",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            logger.info(f"Local login successful: {user.username}")
            log_auth(db, LogAction.LOGIN, user_id=user.id, username=user.username,
                    success=True, details={"method": "local"})
            
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
        
        # Hiçbir koşul sağlanmadıysa (User yok ve LDAP başarısız ya da LDAP kapalı)
        log_auth(db, LogAction.LOGIN_FAILED, username=form_data.username,
                success=False, error_message="Kullanıcı bulunamadı",
                details={"reason": "user_not_found"})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya bilgiler yanlış",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        log_auth(db, LogAction.LOGIN_FAILED, username=form_data.username,
                success=False, error_message=str(e),
                details={"reason": "system_error"})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Giriş yapılamadı",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/users/me", response_model=UserInDB)
async def read_users_me(current_user: UserInDB = Depends(get_current_active_user)):
    return current_user
