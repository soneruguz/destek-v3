from fastapi import FastAPI, Depends, HTTPException, status, Form, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import logging
import models
import os
import glob
from database import get_db, engine
from auth import router as auth_router, get_current_active_user
from routers import tickets
from typing import List, Optional

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Destek API",
    redirect_slashes=False  # Otomatik redirect'i kapat
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth_router, prefix="/auth")

# Include tickets router  
app.include_router(tickets.router)

# Ticket endpoint'leri routers/tickets.py'de tanımlandı

@app.get("/departments")
@app.get("/departments/")
async def get_departments(db: Session = Depends(get_db)):
    """Departmanları getir"""
    try:
        # Veritabanından tüm departmanları çek
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

@app.get("/users/by-departments")
async def get_users_by_selected_departments(department_ids: str, db: Session = Depends(get_db)):
    """Seçilen departmanlara göre kullanıcıları getir - Güvenli"""
    try:
        # Departman ID'lerini parse et
        dept_id_list = [int(x.strip()) for x in department_ids.split(',') if x.strip().isdigit()]
        
        if not dept_id_list:
            return []
        
        # Sadece seçilen departmanlardaki aktif kullanıcıları getir
        users = db.query(models.User).filter(
            models.User.department_id.in_(dept_id_list),
            models.User.is_active == True
        ).all()
        
        user_list = []
        for user in users:
            user_data = {
                "id": user.id,
                "full_name": user.full_name,
                "username": user.username,
                "department_id": user.department_id
            }
            user_list.append(user_data)
        
        logger.info(f"Departmanlar {dept_id_list} için {len(user_list)} kullanıcı döndürüldü")
        return user_list
        
    except Exception as e:
        logger.error(f"Department users error: {str(e)}")
        return []

@app.get("/users")
@app.get("/users/")
async def get_users(db: Session = Depends(get_db)):
    """Kullanıcıları getir - Sadece admin bilgileri"""
    try:
        logger.info("Kullanıcılar getiriliyor...")
        
        # Veritabanından tüm kullanıcıları çek ama sadece gerekli bilgileri döndür
        users = db.query(models.User).all()
        logger.info(f"Veritabanından {len(users)} kullanıcı çekildi")
        
        # Güvenlik için sadece gerekli alanları döndür
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

@app.get("/settings")
@app.get("/settings/")
async def get_settings():
    """Sistem ayarlarını getir"""
    return {
        "site_name": "Destek Sistemi",
        "email_notifications": True,
        "ldap_enabled": True
    }

@app.get("/wikis")
@app.get("/wikis/")
async def get_wikis():
    """Wiki listesi"""
    return [
        {"id": 1, "title": "Şifre Sıfırlama", "content": "IT ile iletişime geçin"},
        {"id": 2, "title": "VPN Bağlantısı", "content": "VPN kurulum rehberi"}
    ]

@app.post("/users/sync-ldap")
async def sync_ldap_users(db: Session = Depends(get_db)):
    """LDAP'tan kullanıcıları toplu olarak çek ve veritabanına ekle"""
    try:
        from auth import sync_ldap_users_func
        result = sync_ldap_users_func(db)
        return result
    except Exception as e:
        logger.error(f"LDAP sync error: {str(e)}")
        return {"success": False, "message": f"LDAP senkronizasyon hatası: {str(e)}"}

@app.post("/tickets/{ticket_id}/assign-to-me")
async def assign_ticket_to_me(ticket_id: int, user_id: int, db: Session = Depends(get_db)):
    """Departmandaki kullanıcı talebi kendine atar"""
    try:
        ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket bulunamadı")
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Kullanıcı aynı departmanda mı kontrol et
        if user.department_id != ticket.department_id:
            raise HTTPException(status_code=403, detail="Bu talebi kendinize atayamazsınız")
        
        # Eğer talep zaten birisine atanmışsa ve o kişi siz değilseniz atanamaz
        if ticket.assignee_id and ticket.assignee_id != user_id:
            raise HTTPException(status_code=409, detail="Bu talep zaten başka birine atanmış")
        
        ticket.assignee_id = user_id
        ticket.status = "in_progress"
        
        db.commit()
        
        return {"success": True, "message": "Talep size atandı"}
        
    except Exception as e:
        logger.error(f"Assign ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    """Tek ticket getir - Erişim kontrolü ile"""
    try:
        logger.info(f"Ticket ID {ticket_id} aranıyor - Kullanıcı: {current_user.username}")
        
        ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
        if not ticket:
            logger.error(f"Ticket ID {ticket_id} bulunamadı")
            raise HTTPException(status_code=404, detail="Ticket bulunamadı")
        
        # Erişim kontrolü - Gelişmiş erişim kontrolü
        can_access = False
        
        # Admin kullanıcıları her şeye erişebilir
        if current_user.username == "admin" or getattr(current_user, 'is_admin', False):
            can_access = True
        # Ticket'ı yaratan kullanıcı erişebilir
        elif ticket.creator_id == current_user.id:
            can_access = True
        # Ticket'a atanan kullanıcı erişebilir
        elif ticket.assignee_id == current_user.id:
            can_access = True
        # Aynı departmandaki kullanıcılar erişebilir
        elif current_user.department_id and current_user.department_id == ticket.department_id:
            can_access = True
            
        if not can_access:
            logger.warning(f"Kullanıcı {current_user.username} ticket {ticket_id}'ye erişim yetkisi yok")
            raise HTTPException(status_code=403, detail="Bu ticket'a erişim yetkiniz yok")
        
        logger.info(f"Ticket bulundu ve erişim izni verildi: {ticket.title}")
        
        # Creator bilgisini getir
        creator = db.query(models.User).filter(models.User.id == ticket.creator_id).first()
        
        # Department bilgisini getir
        department = db.query(models.Department).filter(models.Department.id == ticket.department_id).first()
        
        # Assignee bilgisini getir
        assignee = None
        if ticket.assignee_id:
            assignee = db.query(models.User).filter(models.User.id == ticket.assignee_id).first()
        
        return {
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "is_private": ticket.is_private,
            "created_at": str(ticket.created_at),
            "updated_at": str(ticket.updated_at) if ticket.updated_at else None,
            "creator_id": ticket.creator_id,
            "department_id": ticket.department_id,
            "assignee_id": ticket.assignee_id,
            "creator": {
                "id": creator.id if creator else None,
                "username": creator.username if creator else "admin",
                "full_name": creator.full_name if creator else "System Administrator"
            },
            "department": {
                "id": department.id if department else None,
                "name": department.name if department else "Sistem"
            },
            "assignee": {
                "id": assignee.id if assignee else None,
                "username": assignee.username if assignee else None,
                "full_name": assignee.full_name if assignee else None
            } if assignee else None
        }
    except ValueError:
        logger.error(f"Geçersiz ticket ID: {ticket_id}")
        raise HTTPException(status_code=422, detail="Geçersiz ticket ID")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ticket getir hatası: {str(e)}")
        raise HTTPException(status_code=404, detail="Ticket bulunamadı")

@app.get("/tickets/{ticket_id}/comments")
@app.get("/tickets/{ticket_id}/comments/")
async def get_ticket_comments(ticket_id: int, db: Session = Depends(get_db)):
    """Ticket yorumları getir"""
    try:
        # Şimdilik boş liste döndür, daha sonra Comment modeli eklenince düzeltilecek
        return []
    except Exception as e:
        logger.error(f"Comments error: {str(e)}")
        return []

@app.get("/tickets/{ticket_id}/attachments")
@app.get("/tickets/{ticket_id}/attachments/")
async def get_ticket_attachments(ticket_id: int):
    """Ticket ekleri getir"""
    try:
        from datetime import datetime
        
        # Uploads klasöründe bu ticket'a ait dosyaları bul
        uploads_dir = "/app/uploads"
        if not os.path.exists(uploads_dir):
            return []
        
        # Bu ticket ID'ye ait dosyaları bul
        pattern = os.path.join(uploads_dir, f"{ticket_id}_*")
        files = glob.glob(pattern)
        
        attachments = []
        for i, file_path in enumerate(files):
            filename = os.path.basename(file_path)
            # Dosya adını parse et: ticket_id_uuid_original_name
            parts = filename.split('_', 2)
            if len(parts) >= 3:
                original_name = parts[2]
            else:
                original_name = filename
            
            file_size = os.path.getsize(file_path)
            file_mtime = os.path.getmtime(file_path)
            
            # Dosya tipini belirle
            file_ext = os.path.splitext(original_name)[1].lower()
            if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                content_type = f'image/{file_ext[1:]}'
                file_type = 'image'
            elif file_ext == '.pdf':
                content_type = 'application/pdf'
                file_type = 'pdf'
            elif file_ext in ['.doc', '.docx']:
                content_type = 'application/msword'
                file_type = 'document'
            else:
                content_type = 'application/octet-stream'
                file_type = 'other'
            
            # Dosya boyutunu formatla
            if file_size < 1024:
                size_formatted = f"{file_size} B"
            elif file_size < 1024 * 1024:
                size_formatted = f"{(file_size / 1024):.1f} KB"
            else:
                size_formatted = f"{(file_size / (1024 * 1024)):.1f} MB"
            
            attachments.append({
                "id": i + 1,
                "filename": original_name,
                "safe_filename": filename,
                "size": file_size,
                "size_formatted": size_formatted,
                "uploaded_at": datetime.fromtimestamp(file_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                "content_type": content_type,
                "file_type": file_type,
                "download_url": f"http://192.168.0.75:8001/tickets/{ticket_id}/attachments/{filename}/download",
                "preview_url": f"http://192.168.0.75:8001/tickets/{ticket_id}/attachments/{filename}/preview" if file_type == 'image' else None
            })
        
        logger.info(f"Ticket {ticket_id} için {len(attachments)} dosya bulundu")
        return attachments
        
    except Exception as e:
        logger.error(f"Ticket attachments error: {str(e)}")
        return []

# Dosya indirme endpoint'i ekle
@app.get("/tickets/{ticket_id}/attachments/{filename}/download")
async def download_attachment(ticket_id: int, filename: str):
    """Dosya indir"""
    try:
        uploads_dir = "/app/uploads"
        file_path = os.path.join(uploads_dir, filename)
        
        # Güvenlik kontrolü - dosya adı ticket_id ile başlamalı
        if not filename.startswith(f"{ticket_id}_"):
            raise HTTPException(status_code=403, detail="Bu dosyaya erişim yetkiniz yok")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dosya bulunamadı")
        
        # Orijinal dosya adını çıkar
        parts = filename.split('_', 2)
        original_name = parts[2] if len(parts) >= 3 else filename
        
        return FileResponse(
            path=file_path,
            filename=original_name,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File download error: {str(e)}")
        raise HTTPException(status_code=500, detail="Dosya indirme hatası")

# Resim önizleme endpoint'i ekle
@app.get("/tickets/{ticket_id}/attachments/{filename}/preview")
async def preview_attachment(ticket_id: int, filename: str):
    """Resim önizleme"""
    try:
        uploads_dir = "/app/uploads"
        file_path = os.path.join(uploads_dir, filename)
        
        # Güvenlik kontrolü
        if not filename.startswith(f"{ticket_id}_"):
            raise HTTPException(status_code=403, detail="Bu dosyaya erişim yetkiniz yok")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dosya bulunamadı")
        
        # Sadece resim dosyaları için önizleme
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            raise HTTPException(status_code=400, detail="Bu dosya türü için önizleme desteklenmiyor")
        
        # Content-Type'ı ayarla
        if file_ext in ['.jpg', '.jpeg']:
            media_type = 'image/jpeg'
        elif file_ext == '.png':
            media_type = 'image/png'
        elif file_ext == '.gif':
            media_type = 'image/gif'
        else:
            media_type = 'image/png'
        
        return FileResponse(
            path=file_path,
            media_type=media_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File preview error: {str(e)}")
        raise HTTPException(status_code=500, detail="Dosya önizleme hatası")

@app.get("/users/{user_id}/departments")
async def get_user_departments(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının departman bilgisini getir - Array olarak döndür"""
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Safe access - department_id field'ı yoksa None döndür
        department_id = getattr(user, 'department_id', None)
        
        if department_id:
            department = db.query(models.Department).filter(
                models.Department.id == department_id
            ).first()
            
            if department:
                # Array olarak döndür - frontend bunu bekliyor
                return [{
                    "id": department.id,
                    "name": department.name,
                    "description": department.description
                }]
        
        # Boş array döndür
        return []
        
    except Exception as e:
        logger.error(f"User departments error: {str(e)}")
        return []

@app.post("/admin/migrate-database")
async def migrate_database(db: Session = Depends(get_db)):
    """Veritabanı migration - department_id field'ını ekle"""
    try:
        # SQL komutu ile department_id kolonunu ekle
        db.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)")
        db.commit()
        
        logger.info("Database migration completed - department_id added to users table")
        return {"success": True, "message": "Migration başarılı"}
        
    except Exception as e:
        logger.error(f"Migration error: {str(e)}")
        db.rollback()
        return {"success": False, "message": f"Migration hatası: {str(e)}"}

@app.post("/admin/recreate-tables")
async def recreate_tables(db: Session = Depends(get_db)):
    """Tabloları yeniden oluştur"""
    try:
        # Tüm tabloları sil ve yeniden oluştur
        models.Base.metadata.drop_all(bind=engine)
        models.Base.metadata.create_all(bind=engine)
        
        # Temel departmanları oluştur
        departments = [
            {"name": "Bilgi İşlem", "description": "IT ve teknik destek departmanı"},
            {"name": "Yönetim", "description": "Yönetim departmanı"},
            {"name": "Muhasebe", "description": "Mali işler departmanı"},
            {"name": "İnsan Kaynakları", "description": "İK departmanı"},
            {"name": "Temel Eğitim", "description": "Eğitim departmanı"}
        ]
        
        for dept_data in departments:
            dept = models.Department(
                name=dept_data["name"],
                description=dept_data["description"]
            )
            db.add(dept)
        
        db.flush()  # Departmanları kaydet
        
        # Admin kullanıcısını yeniden oluştur
        from auth import get_password_hash
        
        # İlk departmanı al (Bilgi İşlem)
        it_dept = db.query(models.Department).filter(models.Department.name == "Bilgi İşlem").first()
        
        admin_user = models.User(
            username="admin",
            email="admin@destek.com",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin"),
            is_admin=True,
            is_ldap=False,
            is_active=True,
            department_id=it_dept.id if it_dept else None
        )
        db.add(admin_user)
        db.commit()
        
        logger.info("All tables recreated successfully with departments and admin user")
        return {
            "success": True, 
            "message": f"Tablolar yeniden oluşturuldu, {len(departments)} departman ve admin kullanıcısı eklendi"
        }
        
    except Exception as e:
        logger.error(f"Table recreation error: {str(e)}")
        db.rollback()
        return {"success": False, "message": f"Tablo oluşturma hatası: {str(e)}"}

@app.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcıyı sil"""
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Admin kullanıcısını silme kontrolü
        if user.username == "admin":
            raise HTTPException(status_code=403, detail="Admin kullanıcısı silinemez")
        
        # Kullanıcının ticket'larını kontrol et
        user_tickets = db.query(models.Ticket).filter(
            (models.Ticket.creator_id == user_id) | (models.Ticket.assignee_id == user_id)
        ).count()
        
        if user_tickets > 0:
            # Kullanıcıyı sil ama ticket'ları koru
            user.is_active = False
            user.email = f"deleted_{user.email}"
            user.username = f"deleted_{user.username}"
            db.commit()
            return {"success": True, "message": f"Kullanıcı deaktive edildi ({user_tickets} ticket'ı var)"}
        else:
            # Kullanıcıyı tamamen sil
            db.delete(user)
            db.commit()
            return {"success": True, "message": "Kullanıcı silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User delete error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Kullanıcı silinirken hata oluştu")

@app.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict, db: Session = Depends(get_db)):
    """Kullanıcıyı güncelle"""
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Güncelleme
        if 'full_name' in user_data:
            user.full_name = user_data['full_name']
        if 'email' in user_data:
            user.email = user_data['email']
        if 'department_id' in user_data:
            user.department_id = user_data['department_id']
        if 'is_active' in user_data:
            user.is_active = user_data['is_active']
        
        db.commit()
        return {"success": True, "message": "Kullanıcı güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User update error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Kullanıcı güncellenirken hata oluştu")

@app.get("/config")
@app.get("/config/")
async def get_config():
    """Sistem konfigürasyonunu getir"""
    return {
        "ticket_categories": [
            {"id": 1, "name": "Teknik Destek"},
            {"id": 2, "name": "Yazılım Sorunu"},
            {"id": 3, "name": "Donanım Sorunu"},
            {"id": 4, "name": "Ağ Sorunu"},
            {"id": 5, "name": "Diğer"}
        ],
        "priorities": [
            {"id": 1, "name": "Düşük", "value": "low"},
            {"id": 2, "name": "Normal", "value": "medium"},
            {"id": 3, "name": "Yüksek", "value": "high"},
            {"id": 4, "name": "Acil", "value": "urgent"}
        ],
        "max_file_size": 10485760,
        "allowed_file_types": [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx", ".txt"]
    }

@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Startup event baslatiliyor...")
        
        # Önce models'i import edelim ki relationships hazır olsun
        import models
        
        # Tabloları oluştur
        models.Base.metadata.create_all(bind=engine)
        logger.info("Tablolar olusturuldu")
        
        # Admin user ve temel departmanları kontrol et/oluştur
        from database import get_db
        db = next(get_db())
        
        try:
            # Departman kontrolü
            dept_count = db.query(models.Department).count()
            if dept_count == 0:
                logger.info("Temel departmanlar oluşturuluyor...")
                departments = [
                    {"name": "Bilgi İşlem", "description": "IT ve teknik destek departmanı"},
                    {"name": "Yönetim", "description": "Yönetim departmanı"},
                    {"name": "Muhasebe", "description": "Mali işler departmanı"}
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
        logger.info("Tablolar yeniden oluşturulması gerekiyor - /admin/recreate-tables endpoint'ini çağırın")

@app.get("/debug/test-ticket")
async def debug_test_ticket(db: Session = Depends(get_db)):
    """Debug: Ticket oluşturma test et"""
    try:
        logger.info("Debug ticket test başlıyor...")
        
        # Admin user kontrolü
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            logger.warning("Admin user not found, creating one...")
            
            # İlk departmanı al veya oluştur
            first_dept = db.query(models.Department).first()
            if not first_dept:
                first_dept = models.Department(
                    name="Test Departman",
                    description="Test departmanı"
                )
                db.add(first_dept)
                db.flush()
            
            from auth import get_password_hash
            admin_user = models.User(
                username="admin",
                email="admin@test.com",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin"),
                is_admin=True,
                is_ldap=False,
                is_active=True,
                department_id=first_dept.id
            )
            db.add(admin_user)
            db.flush()
            logger.info("Admin user created successfully")
        
        # Test ticket oluştur - is_private field'ını kaldır
        test_ticket = models.Ticket(
            title="Test Ticket",
            description="Bu bir test ticket'ıdır",
            priority="low",
            status="open",
            creator_id=admin_user.id,
            department_id=admin_user.department_id,
            assignee_id=None
        )
        
        db.add(test_ticket)
        db.commit()
        db.refresh(test_ticket)
        
        logger.info(f"Test ticket oluşturuldu: ID {test_ticket.id}")
        
        return {
            "success": True, 
            "message": "Test ticket oluşturuldu",
            "ticket_id": test_ticket.id,
            "admin_user": admin_user.username,
            "department_id": admin_user.department_id
        }
        
    except Exception as e:
        logger.error(f"Debug test error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}

@app.post("/tickets/{ticket_id}/attachments")
@app.post("/tickets/{ticket_id}/attachments/")
async def upload_attachment(ticket_id: int, file: UploadFile = File(...)):
    """Ticket'a dosya ekle"""
    try:
        logger.info(f"Dosya yükleme isteği alındı: ticket_id={ticket_id}, filename={file.filename}")
        
        # Ticket'in var olup olmadığını kontrol et
        from database import get_db
        db = next(get_db())
        
        try:
            ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
            if not ticket:
                raise HTTPException(status_code=404, detail="Ticket bulunamadı")
            
            # Basit validasyon
            if not file.filename:
                raise HTTPException(status_code=400, detail="Dosya adı bulunamadı")
            
            # Dosya boyutu kontrolü (5MB limit)
            file_content = await file.read()
            file_size = len(file_content)
            
            if file_size > 5 * 1024 * 1024:  # 5MB
                raise HTTPException(status_code=400, detail="Dosya boyutu 5MB'dan büyük olamaz")
            
            logger.info(f"Dosya boyutu: {file_size} bytes")
            logger.info(f"Content type: {file.content_type}")
            
            # Uploads klasörünü oluştur
            import os
            uploads_dir = "/app/uploads"
            if not os.path.exists(uploads_dir):
                os.makedirs(uploads_dir)
                logger.info(f"Uploads klasörü oluşturuldu: {uploads_dir}")
            
            # Dosya adını güvenli hale getir
            import uuid
            safe_filename = f"{ticket_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
            file_path = os.path.join(uploads_dir, safe_filename)
            
            # Dosyayı kaydet
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
            
            logger.info(f"Dosya kaydedildi: {file_path}")
            
            # Başarılı response döndür
            response_data = {
                "success": True,
                "filename": file.filename,
                "safe_filename": safe_filename,
                "message": "Dosya başarıyla yüklendi ve kaydedildi",
                "ticket_id": ticket_id,
                "content_type": file.content_type,
                "size": file_size,
                "file_path": file_path
            }
            
            logger.info(f"Dosya yükleme başarılı: {response_data}")
            return response_data
            
        finally:
            db.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dosya yükleme hatası: {str(e)}")
        logger.error(f"Hata tipi: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Dosya yükleme hatası: {str(e)}")

# Geçici paylaşım verilerini saklamak için dictionary (gerçek uygulamada veritabanında olacak)
ticket_shares = {}

@app.post("/tickets/{ticket_id}/share")
async def share_ticket(ticket_id: int, share_data: dict, db: Session = Depends(get_db)):
    """Ticket'ı paylaş"""
    try:
        logger.info(f"Ticket {ticket_id} paylaşım isteği: {share_data}")
        
        # Paylaşım verilerini sakla
        if ticket_id not in ticket_shares:
            ticket_shares[ticket_id] = {"users": [], "departments": []}
        
        # Kullanıcı paylaşımları ekle
        user_ids = share_data.get("user_ids", [])
        dept_ids = share_data.get("department_ids", [])
        
        # Mevcut paylaşımları güncelle
        ticket_shares[ticket_id]["users"] = list(set(ticket_shares[ticket_id]["users"] + user_ids))
        ticket_shares[ticket_id]["departments"] = list(set(ticket_shares[ticket_id]["departments"] + dept_ids))
        
        logger.info(f"Ticket {ticket_id} paylaşım güncellendi: {ticket_shares[ticket_id]}")
        
        return {"success": True, "message": "Ticket başarıyla paylaşıldı"}
    except Exception as e:
        logger.error(f"Share ticket error: {str(e)}")
        raise HTTPException(status_code=500, detail="Ticket paylaşılırken hata oluştu")

@app.get("/tickets/{ticket_id}/shared_users")
@app.get("/tickets/{ticket_id}/shared_users/")
async def get_ticket_shared_users(ticket_id: int, db: Session = Depends(get_db)):
    """Ticket paylaşılan kullanıcılar"""
    try:
        if ticket_id not in ticket_shares or not ticket_shares[ticket_id]["users"]:
            return []
        
        # Paylaşılan kullanıcı ID'lerini al
        user_ids = ticket_shares[ticket_id]["users"]
        
        # Kullanıcı bilgilerini veritabanından getir
        users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
        
        shared_users = []
        for user in users:
            shared_users.append({
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": getattr(user, 'email', f"{user.username}@sistem.com")
            })
        
        logger.info(f"Ticket {ticket_id} için {len(shared_users)} paylaşılan kullanıcı döndürüldü")
        return shared_users
        
    except Exception as e:
        logger.error(f"Shared users error: {str(e)}")
        return []

@app.get("/tickets/{ticket_id}/shared_departments")
@app.get("/tickets/{ticket_id}/shared_departments/")
async def get_ticket_shared_departments(ticket_id: int, db: Session = Depends(get_db)):
    """Ticket paylaşılan departmanlar"""
    try:
        if ticket_id not in ticket_shares or not ticket_shares[ticket_id]["departments"]:
            return []
        
        # Paylaşılan departman ID'lerini al
        dept_ids = ticket_shares[ticket_id]["departments"]
        
        # Departman bilgilerini veritabanından getir
        departments = db.query(models.Department).filter(models.Department.id.in_(dept_ids)).all()
        
        shared_departments = []
        for dept in departments:
            shared_departments.append({
                "id": dept.id,
                "name": dept.name,
                "description": dept.description
            })
        
        logger.info(f"Ticket {ticket_id} için {len(shared_departments)} paylaşılan departman döndürüldü")
        return shared_departments
        
    except Exception as e:
        logger.error(f"Shared departments error: {str(e)}")
        return []

@app.get("/notifications")
@app.get("/notifications/")
async def get_notifications(db: Session = Depends(get_db)):
    """Bildirim listesini getir"""
    try:
        return []
    except Exception as e:
        logger.error(f"Notifications error: {str(e)}")
        return []

@app.get("/notifications/unread-count")
async def get_unread_count():
    """Okunmamış bildirim sayısını getir"""
    return {"count": 0}

@app.get("/notifications/vapid-public-key")
async def get_vapid_public_key():
    """VAPID public key getir"""
    try:
        return {"public_key": "dummy-vapid-key"}
    except Exception as e:
        logger.error(f"VAPID key error: {str(e)}")
        return {"public_key": "dummy-vapid-key"}

@app.get("/notifications/settings")
async def get_notification_settings(db: Session = Depends(get_db)):
    """Bildirim ayarlarını getir"""
    try:
        return {
            "email_notifications": True,
            "push_notifications": False,
            "ticket_assignments": True,
            "ticket_updates": True
        }
    except Exception as e:
        logger.error(f"Notification settings error: {str(e)}")
        return {"email_notifications": True, "push_notifications": False, "ticket_assignments": True, "ticket_updates": True}

