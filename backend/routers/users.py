from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
import models, schemas
from auth import get_current_active_user, get_password_hash, sync_ldap_users_func

router = APIRouter(tags=["users"])

@router.post("/", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Yeni kullanıcı oluşturuluyor: {user.username}, LDAP: {user.is_ldap}")
    
    # Sadece yöneticiler kullanıcı oluşturabilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler kullanıcı oluşturabilir")
    
    # Kullanıcı adı veya e-posta zaten kullanılıyor mu kontrol et
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    
    if db_user:
        logger.error(f"Kullanıcı zaten mevcut - username: {user.username}, email: {user.email}")
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı veya e-posta zaten kullanılıyor")
    
    # Eğer LDAP kullanıcısı değilse şifre gereklidir
    if not user.is_ldap and not user.password:
        raise HTTPException(status_code=400, detail="Yerel kullanıcılar için şifre gereklidir")
    
    # Yeni kullanıcı oluştur
    hashed_password = get_password_hash(user.password) if user.password else None
    
    new_user = models.User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_active=True,
        is_admin=user.is_admin,
        is_ldap=user.is_ldap
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Departmanlara ekle
    if user.department_ids:
        for dept_id in user.department_ids:
            department = db.query(models.Department).filter(models.Department.id == dept_id).first()
            if department:
                new_user.departments.append(department)
        
        db.commit()
        db.refresh(new_user)
    
    return schemas.UserResponse.from_user(new_user)

@router.get("/", response_model=List[schemas.User])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    include_ldap: bool = True,
    active_only: bool = False
):
    # Kullanıcı sorgusu oluştur
    query = db.query(models.User)
    
    # Sadece yerel kullanıcılar isteniyorsa
    if not include_ldap:
        query = query.filter(models.User.is_ldap == False)
    
    # Sadece aktif kullanıcılar isteniyorsa
    if active_only:
        query = query.filter(models.User.is_active == True)
    
    # ID'ye göre sıralı getir
    users = query.order_by(models.User.id).all()
    
    # Clean user objects oluştur
    return [schemas.UserResponse.from_user(user) for user in users]

@router.get("/me", response_model=schemas.User)
def get_current_user_info(
    current_user: models.User = Depends(get_current_active_user)
):
    return schemas.UserResponse.from_user(current_user)

@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    return schemas.UserResponse.from_user(user)

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Yönetici olmayan kullanıcılar sadece kendi bilgilerini güncelleyebilir
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Sadece kendi bilgilerinizi güncelleyebilirsiniz")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # LDAP kullanıcıları şifrelerini değiştiremez
    if user.is_ldap and user_update.password and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="LDAP kullanıcıları şifrelerini bu sistemde değiştiremez")
    
    # E-posta çakışmasını kontrol et
    if user_update.email is not None:
        import logging
        logger = logging.getLogger(__name__)
        
        # Trim and normalize
        new_email = user_update.email.strip() if user_update.email else None
        current_email = user.email.strip() if user.email else None
        
        logger.info(f"Email update check - Current: '{current_email}', New: '{new_email}', User ID: {user_id}")
        
        # Only check for duplicates if email is actually changing (case-insensitive comparison)
        if new_email and current_email and new_email.lower() != current_email.lower():
            logger.info(f"Email is changing, checking for duplicates")
            # Case-insensitive duplicate check using SQL functions
            db_user = db.query(models.User).filter(
                models.User.id != user_id
            ).filter(
                func.lower(func.trim(models.User.email)) == new_email.lower()
            ).first()
            if db_user:
                logger.info(f"Duplicate email found for user {db_user.id}")
                raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanılıyor")
        elif not current_email and new_email:
            # Setting email for first time, check duplicates
            logger.info(f"Setting email for first time, checking for duplicates")
            db_user = db.query(models.User).filter(
                func.lower(func.trim(models.User.email)) == new_email.lower(),
                models.User.id != user_id
            ).first()
            if db_user:
                logger.info(f"Duplicate email found for user {db_user.id}")
                raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kullanılıyor")
    
    # Kullanıcı bilgilerini güncelle (yalnızca sağlananları)
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    # Şifre güncellemesi (eğer yeni şifre verildiyse ve LDAP kullanıcısı değilse)
    if user_update.password and (not user.is_ldap or current_user.is_admin):
        user.hashed_password = get_password_hash(user_update.password)
    
    # Yönetici yetkisi güncelleme (sadece yöneticiler yapabilir)
    if current_user.is_admin:
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        if user_update.is_admin is not None:
            user.is_admin = user_update.is_admin
        
        # Departman güncellemeleri (sadece yöneticiler yapabilir)
        if user_update.department_ids is not None:
            # department_ids array'inin ilk elemanını primary department olarak ayarla
            if user_update.department_ids:
                # İlk departmanı primary department olarak ayarla
                user.department_id = user_update.department_ids[0]
                
                # Tüm departmanları many-to-many ilişkiye ekle
                user.departments.clear()  # Mevcut departmanları temizle
                for dept_id in user_update.department_ids:
                    department = db.query(models.Department).filter(models.Department.id == dept_id).first()
                    if department:
                        user.departments.append(department)
            else:
                # Hiç departman seçilmemişse null yap
                user.department_id = None
                user.departments.clear()
    
    db.commit()
    db.refresh(user)
    
    return schemas.UserResponse.from_user(user)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Sadece yöneticiler kullanıcı silebilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler kullanıcı silebilir")
    
    # Kendini silmeyi engelle
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Kullanıcının açtığı talepleri kontrol et
    tickets = db.query(models.Ticket).filter(models.Ticket.creator_id == user_id).count()
    if tickets > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Bu kullanıcı {tickets} adet destek talebi açmış. Silmek için önce talepleri başka bir kullanıcıya taşıyın veya silin."
        )
    
    db.delete(user)
    db.commit()
    return None

@router.get("/{user_id}/departments")
def get_user_departments(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Sadece yöneticiler kullanıcı departmanlarını görebilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yönetici yetkisi gereklidir")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Kullanıcının tüm departmanlarını döndür (many-to-many)
    return user.departments


@router.post("/sync-ldap")
def sync_ldap_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Sadece yöneticiler toplu LDAP senkronizasyonu yapabilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler LDAP senkronizasyonu başlatabilir")

    try:
        return sync_ldap_users_func(db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LDAP senkronizasyon hatası: {str(e)}")
