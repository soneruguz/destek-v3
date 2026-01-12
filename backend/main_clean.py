from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging
import models
from database import get_db, engine
from auth import router as auth_router, get_current_active_user
from routers import tickets

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Destek API",
    redirect_slashes=False
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth")
app.include_router(tickets.router)

# Sadece temel endpoint'ler - ticket endpoint'leri routers/tickets.py'de

@app.get("/departments")
@app.get("/departments/")
async def get_departments(db: Session = Depends(get_db)):
    """Departmanları getir"""
    try:
        departments = db.query(models.Department).all()
        department_list = []
        for dept in departments:
            dept_data = {
                "id": dept.id,
                "name": dept.name,
                "description": dept.description,
                "user_count": len(dept.users) if dept.users else 0
            }
            department_list.append(dept_data)
        
        logger.info(f"Döndürülen departman sayısı: {len(department_list)}")
        return department_list
        
    except Exception as e:
        logger.error(f"Departments error: {str(e)}")
        return []

@app.get("/users")
@app.get("/users/")
async def get_users(db: Session = Depends(get_db)):
    """Kullanıcıları getir"""
    try:
        logger.info("Kullanıcılar getiriliyor...")
        users = db.query(models.User).all()
        logger.info(f"Veritabanından {len(users)} kullanıcı çekildi")
        
        user_list = []
        for user in users:
            try:
                user_data = {
                    "id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "is_active": user.is_active,
                    "department_id": getattr(user, 'department_id', None)
                }
                user_list.append(user_data)
            except Exception as user_error:
                logger.error(f"Kullanıcı {user.username} işlenirken hata: {user_error}")
                continue
        
        logger.info(f"Döndürülen kullanıcı sayısı: {len(user_list)}")
        return user_list
        
    except Exception as e:
        logger.error(f"Users endpoint hatası: {str(e)}")
        return []

@app.get("/notifications")
@app.get("/notifications/")
async def get_notifications():
    """Bildirim listesi"""
    return []

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
            
            db.commit()
            logger.info("Startup tamamlandı - admin user ve departmanlar hazır")
            
        finally:
            db.close()
        
        logger.info("Backend başarıyla başlatıldı")
        
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
