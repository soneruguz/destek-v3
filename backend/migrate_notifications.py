import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL bulunamadı!")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Bildirim ayarları migrasyonu başlatılıyor...")
        
        new_columns = [
            ("ticket_created", "BOOLEAN DEFAULT TRUE"),
            ("wiki_created", "BOOLEAN DEFAULT TRUE"),
            ("wiki_updated", "BOOLEAN DEFAULT TRUE"),
            ("wiki_shared", "BOOLEAN DEFAULT TRUE")
        ]

        for col_name, col_type in new_columns:
            try:
                # Kolon var mı kontrol et (PostgreSQL için)
                check_query = text(f"SELECT 1 FROM information_schema.columns WHERE table_name='notification_settings' AND column_name='{col_name}'")
                result = conn.execute(check_query).fetchone()
                
                if not result:
                    conn.execute(text(f"ALTER TABLE notification_settings ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"notification_settings: {col_name} eklendi.")
                else:
                    print(f"notification_settings: {col_name} zaten var.")
            except Exception as e:
                print(f"notification_settings: {col_name} eklenemedi: {e}")

        conn.commit()
        print("Migrasyon tamamlandı.")

if __name__ == "__main__":
    migrate()
