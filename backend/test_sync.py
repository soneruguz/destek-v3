import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from auth import sync_ldap_users_func
import models

# Doğru veritabanı URL'ini ayarla (docker-compose.yml'deki şifreyi kullan)
DATABASE_URL = "postgresql://destek_user:destek_pass@localhost:5432/destek_db"

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Test bağlantısı
    db = SessionLocal()
    
    print("Veritabanı bağlantısı başarılı!")
    
    # LDAP senkronizasyonu test et
    print("LDAP senkronizasyonu başlatılıyor...")
    result = sync_ldap_users_func(db)
    print(f"Sonuç: {result}")
    
    db.close()
    
except Exception as e:
    print(f"Hata: {e}")
    print("\nÇözüm önerileri:")
    print("1. Docker container'ları çalıştırın: docker-compose up -d")
    print("2. ldap3 modülü kurun: pip install ldap3")
    print("3. Veritabanı şifresini kontrol edin (destek_pass)")
