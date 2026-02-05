"""
Merkezi Sistem Loglama Modülü
Tüm sistem işlemlerini loglar: auth, ticket, mail, user, department, wiki, system
"""

from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging
from typing import Optional, Any, Dict
from database import SessionLocal
import models

logger = logging.getLogger("uvicorn.error")

# Log Kategorileri
class LogCategory:
    AUTH = "auth"           # Giriş/çıkış işlemleri
    TICKET = "ticket"       # Talep işlemleri
    MAIL = "mail"           # E-posta işlemleri
    USER = "user"           # Kullanıcı işlemleri
    DEPARTMENT = "department"  # Departman işlemleri
    WIKI = "wiki"           # Bilgi bankası işlemleri
    SYSTEM = "system"       # Sistem işlemleri
    NOTIFICATION = "notification"  # Bildirim işlemleri
    FILE = "file"           # Dosya işlemleri

# Log Aksiyonları
class LogAction:
    # Auth
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    
    # CRUD
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    
    # Mail
    SEND = "send"
    SEND_FAILED = "send_failed"
    REJECTED = "rejected"  # Kullanıcı mail almak istemiyor
    
    # File
    UPLOAD = "upload"
    DOWNLOAD = "download"
    
    # System
    EXPORT = "export"
    IMPORT = "import"
    BACKUP = "backup"
    SETTINGS_CHANGE = "settings_change"

# Log Durumları
class LogStatus:
    SUCCESS = "success"
    FAILED = "failed"
    WARNING = "warning"


def create_system_log(
    db: Optional[Session],
    category: str,
    action: str,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    target_name: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    status: str = LogStatus.SUCCESS,
    error_message: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Sistem logu oluşturur.
    
    Args:
        db: Veritabanı session'ı (None ise yeni session oluşturulur)
        category: Log kategorisi (LogCategory)
        action: Yapılan işlem (LogAction)
        user_id: İşlemi yapan kullanıcı ID'si
        username: İşlemi yapan kullanıcı adı
        target_type: Hedef kayıt türü (ticket, user, etc.)
        target_id: Hedef kayıt ID'si
        target_name: Hedef kayıt adı
        details: Ek detaylar (dict olarak, JSON'a çevrilir)
        status: Log durumu (LogStatus)
        error_message: Hata mesajı
        ip_address: IP adresi
        user_agent: User agent
    """
    standalone_session = False
    if not db:
        db = SessionLocal()
        standalone_session = True
    
    try:
        # İstanbul timezone
        import pytz
        istanbul_tz = pytz.timezone('Europe/Istanbul')
        now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
        
        log_entry = models.SystemLog(
            category=category,
            action=action,
            user_id=user_id,
            username=username,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            details=json.dumps(details, ensure_ascii=False) if details else None,
            status=status,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now_istanbul
        )
        
        db.add(log_entry)
        db.commit()
        
        # Console log
        log_msg = f"[{category.upper()}] {action} - User: {username or 'System'}"
        if target_type and target_name:
            log_msg += f" - Target: {target_type}:{target_name}"
        if status == LogStatus.FAILED:
            logger.error(log_msg + f" - Error: {error_message}")
        elif status == LogStatus.WARNING:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)
            
    except Exception as e:
        logger.error(f"Sistem logu oluşturulurken hata: {str(e)}")
        if standalone_session:
            db.rollback()
    finally:
        if standalone_session:
            db.close()


# Yardımcı fonksiyonlar - kolay kullanım için

def log_auth(db: Session, action: str, user_id: int = None, username: str = None, 
             ip_address: str = None, user_agent: str = None, success: bool = True, 
             error_message: str = None, details: dict = None):
    """Kimlik doğrulama logları"""
    create_system_log(
        db=db,
        category=LogCategory.AUTH,
        action=action,
        user_id=user_id,
        username=username,
        status=LogStatus.SUCCESS if success else LogStatus.FAILED,
        error_message=error_message,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )


def log_ticket(db: Session, action: str, ticket_id: int, ticket_title: str,
               user_id: int = None, username: str = None, details: dict = None,
               ip_address: str = None):
    """Talep işlem logları"""
    create_system_log(
        db=db,
        category=LogCategory.TICKET,
        action=action,
        user_id=user_id,
        username=username,
        target_type="ticket",
        target_id=ticket_id,
        target_name=ticket_title,
        details=details,
        ip_address=ip_address
    )


def log_mail(db: Session, action: str, recipient_email: str, subject: str = None,
             user_id: int = None, username: str = None, success: bool = True,
             error_message: str = None, details: dict = None):
    """E-posta gönderim logları"""
    create_system_log(
        db=db,
        category=LogCategory.MAIL,
        action=action,
        user_id=user_id,
        username=username,
        target_type="email",
        target_name=recipient_email,
        details={**(details or {}), "subject": subject} if subject else details,
        status=LogStatus.SUCCESS if success else LogStatus.FAILED,
        error_message=error_message
    )


def log_user(db: Session, action: str, target_user_id: int, target_username: str,
             user_id: int = None, username: str = None, details: dict = None,
             ip_address: str = None):
    """Kullanıcı işlem logları"""
    create_system_log(
        db=db,
        category=LogCategory.USER,
        action=action,
        user_id=user_id,
        username=username,
        target_type="user",
        target_id=target_user_id,
        target_name=target_username,
        details=details,
        ip_address=ip_address
    )


def log_department(db: Session, action: str, dept_id: int, dept_name: str,
                   user_id: int = None, username: str = None, details: dict = None,
                   ip_address: str = None):
    """Departman işlem logları"""
    create_system_log(
        db=db,
        category=LogCategory.DEPARTMENT,
        action=action,
        user_id=user_id,
        username=username,
        target_type="department",
        target_id=dept_id,
        target_name=dept_name,
        details=details,
        ip_address=ip_address
    )


def log_wiki(db: Session, action: str, wiki_id: int, wiki_title: str,
             user_id: int = None, username: str = None, details: dict = None,
             ip_address: str = None):
    """Wiki işlem logları"""
    create_system_log(
        db=db,
        category=LogCategory.WIKI,
        action=action,
        user_id=user_id,
        username=username,
        target_type="wiki",
        target_id=wiki_id,
        target_name=wiki_title,
        details=details,
        ip_address=ip_address
    )


def log_file(db: Session, action: str, filename: str, ticket_id: int = None,
             user_id: int = None, username: str = None, details: dict = None,
             ip_address: str = None):
    """Dosya işlem logları"""
    create_system_log(
        db=db,
        category=LogCategory.FILE,
        action=action,
        user_id=user_id,
        username=username,
        target_type="file",
        target_id=ticket_id,
        target_name=filename,
        details=details,
        ip_address=ip_address
    )


def log_system(db: Session, action: str, details: dict = None,
               user_id: int = None, username: str = None,
               status: str = LogStatus.SUCCESS, error_message: str = None,
               ip_address: str = None):
    """Sistem işlem logları"""
    create_system_log(
        db=db,
        category=LogCategory.SYSTEM,
        action=action,
        user_id=user_id,
        username=username,
        details=details,
        status=status,
        error_message=error_message,
        ip_address=ip_address
    )


def log_notification(db: Session, action: str, notification_type: str,
                     recipient_id: int = None, recipient_name: str = None,
                     user_id: int = None, username: str = None,
                     success: bool = True, error_message: str = None,
                     details: dict = None):
    """Bildirim logları"""
    create_system_log(
        db=db,
        category=LogCategory.NOTIFICATION,
        action=action,
        user_id=user_id,
        username=username,
        target_type=notification_type,
        target_id=recipient_id,
        target_name=recipient_name,
        details=details,
        status=LogStatus.SUCCESS if success else LogStatus.FAILED,
        error_message=error_message
    )
