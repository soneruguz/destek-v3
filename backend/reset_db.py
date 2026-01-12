from database import engine, get_db
from models import Base, User, Department, SystemConfig
from passlib.context import CryptContext
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def reset_database():
    """Veritabanını sıfırlar ve temel verileri yükler."""
    print("Veritabanı sıfırlanıyor...")
    
    # Tüm tabloları sil
    Base.metadata.drop_all(bind=engine)
    
    # Tabloları tekrar oluştur
    Base.metadata.create_all(bind=engine)
    
    # DB Session al
    db = next(get_db())
    
    # Admin kullanıcısı oluştur
    admin_password_hash = get_password_hash("admin")
    admin_user = User(
        username="admin",
        email="admin@sirket.com",
        full_name="Sistem Yöneticisi",
        hashed_password=admin_password_hash,
        is_active=True,
        is_admin=True,
        is_ldap=False
    )
    db.add(admin_user)
    
    # Genel departman oluştur
    general_dept = Department(
        name="Genel",
        description="Genel destek talepleri departmanı"
    )
    db.add(general_dept)
    
    # Sistem yapılandırması oluştur
    system_config = SystemConfig()
    db.add(system_config)
    
    # Değişiklikleri kaydet
    db.commit()
    
    # Uploads dizini oluştur
    os.makedirs("uploads", exist_ok=True)
    
    print("Veritabanı başarıyla sıfırlandı ve temel veriler yüklendi.")

if __name__ == "__main__":
    reset_database()
