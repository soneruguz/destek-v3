# Kullanıcı giriş kayıtları tablosunu oluşturan migrasyon
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, DateTime, func, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Veritabanı bağlantı bilgileri
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/destek")
print(f"Bağlanılacak veritabanı: {DATABASE_URL}")

# Engine oluştur
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tabanı tanımla
Base = declarative_base()

def run_migration():
    # Veritabanı bağlantısı
    db = SessionLocal()
    
    try:
        # user_login_logs tablosunun varlığını kontrol et
        result = db.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_login_logs')"))
        table_exists = result.scalar()
        
        if not table_exists:
            print("user_login_logs tablosu oluşturuluyor...")
            
            # Tablo oluşturma SQL ifadesi
            create_table_sql = """
            CREATE TABLE user_login_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                ip_address VARCHAR,
                user_agent VARCHAR,
                device_info VARCHAR,
                login_status BOOLEAN DEFAULT TRUE
            );
            """
            
            # Tabloyu oluştur
            db.execute(text(create_table_sql))
            db.commit()
            
            # Indeks oluştur
            db.execute(text("CREATE INDEX idx_user_login_logs_user_id ON user_login_logs (user_id);"))
            db.execute(text("CREATE INDEX idx_user_login_logs_login_time ON user_login_logs (login_time);"))
            db.commit()
            
            print("user_login_logs tablosu başarıyla oluşturuldu.")
        else:
            print("user_login_logs tablosu zaten mevcut, migrasyon atlanıyor.")
        
    except Exception as e:
        db.rollback()
        print(f"Migrasyon sırasında hata oluştu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
