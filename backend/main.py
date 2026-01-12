from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
import models
from database import get_db, engine
from auth import router as auth_router
from routers import tickets, notifications, users, departments, wikis, system_settings, login_logs

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Destek API",
    redirect_slashes=True  # Hem /users hem /users/ çalışsın
)

# Static files (uploads) - dinamik dizin desteği eklenecek
import os
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS - Ortam değişkeninden okunur, yoksa localhost
import os
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3005").split(",")
cors_origins = [origin.strip() for origin in cors_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Public notification endpoints - router'dan ÖNCE tanımlanmalı
@app.get("/api/notifications/vapid-public-key")
async def get_vapid_public_key():
    """VAPID public key'i döndür - authentication gerektirmez"""
    return {"publicKey": "BLBz4TKkKHRLdLJ36UNT7_eLJHLEBB1CPxNn3R1MytaR9jdJvEcTNWHo7qV_sIHYdBK7-xF4Wp9c7yJKPsOI9LA"}

# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(tickets.router, prefix="/api/tickets")
app.include_router(users.router, prefix="/api/users")
app.include_router(departments.router, prefix="/api/departments")
app.include_router(wikis.router, prefix="/api/wikis")
app.include_router(system_settings.router, prefix="/api/settings")
app.include_router(login_logs.router, prefix="/api/login-logs")
app.include_router(notifications.router, prefix="/api/notifications")

# Sadece temel endpoint'ler - ticket endpoint'leri routers/tickets.py'de

# NOT: /departments ve /users endpoint'leri routers/departments.py ve routers/users.py'de zaten tanımlı
# FastAPI'de çift dekoratör (örn. @app.get("/users") ve @app.get("/users/")) sonsuz döngü yaratır
# Routers zaten tüm endpoint'leri yönetiyor; buradaki ek tanımları siliyoruz

@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Startup event baslatiliyor...")
        
        import models
        models.Base.metadata.create_all(bind=engine)
        logger.info("Tablolar olusturuldu")
        
        db = next(get_db())
        
        try:
            # Departman kontrolü
            dept_count = db.query(models.Department).count()
            if dept_count == 0:
                logger.info("Temel departmanlar oluşturuluyor...")
                departments = [
                    {"name": "Bilgi İşlem", "description": "IT ve teknik destek departmanı"},
                    {"name": "Yönetim", "description": "Yönetim departmanı"},
                    {"name": "Muhasebe", "description": "Mali işler departmanı"},
                    {"name": "İnsan Kaynakları", "description": "İK departmanı"},
                    {"name": "Temel Eğitim", "description": "Eğitim departmanı"}
                ]
                
                for dept_data in departments:
                    dept = models.Department(**dept_data)
                    db.add(dept)
                db.flush()
            
            # Admin user kontrolü
            admin_user = db.query(models.User).filter(models.User.username == "admin").first()
            if not admin_user:
                logger.info("Admin user oluşturuluyor...")
                first_dept = db.query(models.Department).first()
                
                from auth import get_password_hash
                admin_user = models.User(
                    username="admin",
                    email="admin@destek.com",
                    full_name="System Administrator",
                    hashed_password=get_password_hash("admin"),
                    is_admin=True,
                    is_ldap=False,
                    is_active=True,
                    department_id=first_dept.id if first_dept else None
                )
                db.add(admin_user)
            
            # GeneralConfig kontrolü
            config = db.query(models.GeneralConfig).first()
            if not config:
                logger.info("GeneralConfig oluşturuluyor...")
                config = models.GeneralConfig(
                    app_name="Destek Sistemi",
                    app_version="1.0.0",
                    allowed_file_types="pdf,doc,docx,txt,jpg,jpeg,png,gif,tiff,tif,zip,rar",
                    max_file_size_mb=10
                )
                db.add(config)
            
            db.commit()
            logger.info("Startup tamamlandı - admin user, departmanlar ve konfigürasyon hazır")
            
        finally:
            db.close()
        
        logger.info("Backend başarıyla başlatıldı")
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")

@app.get("/config/")
@app.get("/config")
async def get_config(db: Session = Depends(get_db)):
    """Frontend configuration"""
    try:
        # Database'den GeneralConfig al
        general_config = db.query(models.GeneralConfig).first()
        
        if general_config:
            return {
                "app_name": general_config.app_name,
                "version": general_config.app_version,
                "enable_teos_id": general_config.enable_teos_id,
                "enable_citizenship_no": general_config.enable_citizenship_no,
                "require_teos_id": general_config.require_teos_id,
                "require_citizenship_no": general_config.require_citizenship_no,
                "features": {
                    "notifications": True,
                    "attachments": True,
                    "ldap": general_config.ldap_enabled
                },
                "notification_types": ["info", "warning", "error", "success"]
            }
        else:
            # Default değerler
            return {
                "app_name": "Destek Sistemi",
                "version": "1.0.0",
                "enable_teos_id": False,
                "enable_citizenship_no": False,
                "require_teos_id": False,
                "require_citizenship_no": False,
                "features": {
                    "notifications": True,
                    "attachments": True,
                    "ldap": False
                },
                "notification_types": ["info", "warning", "error", "success"]
            }
    except Exception as e:
        logger.error(f"Config error: {str(e)}")
        # Hata durumunda default değerler döndür
        return {
            "app_name": "Destek Sistemi",
            "version": "1.0.0",
            "enable_teos_id": False,
            "enable_citizenship_no": False,
            "require_teos_id": False,
            "require_citizenship_no": False,
            "features": {
                "notifications": True,
                "attachments": True,
                "ldap": False
            },
            "notification_types": ["info", "warning", "error", "success"]
        }