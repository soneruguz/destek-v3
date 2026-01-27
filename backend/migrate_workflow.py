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

# Docker içinde çalışıyorsak db host adını kullan, dışarıdan localhost gerekebilir
# Ancak bu script docker içinde çalıştırılacak varsayımıyla devam edelim.

engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Migrasyon başlatılıyor...")
        
        # 1. tickets tablosuna kolon ekleme
        try:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN last_escalation_at TIMESTAMP WITHOUT TIME ZONE"))
            print("tickets: last_escalation_at eklendi.")
        except Exception as e:
            print(f"tickets: last_escalation_at eklenemedi (muhtemelen zaten var): {e}")

        try:
            conn.execute(text("ALTER TABLE tickets ADD COLUMN escalation_count INTEGER DEFAULT 0"))
            print("tickets: escalation_count eklendi.")
        except Exception as e:
            print(f"tickets: escalation_count eklenemedi (muhtemelen zaten var): {e}")

        # 2. general_config tablosuna kolon ekleme
        new_config_columns = [
            ("workflow_enabled", "BOOLEAN DEFAULT FALSE"),
            ("triage_user_id", "INTEGER REFERENCES users(id)"),
            ("triage_department_id", "INTEGER REFERENCES departments(id)"),
            ("escalation_enabled", "BOOLEAN DEFAULT FALSE"),
            ("escalation_target_user_id", "INTEGER REFERENCES users(id)"),
            ("escalation_target_department_id", "INTEGER REFERENCES departments(id)"),
            ("timeout_critical", "INTEGER DEFAULT 60"),
            ("timeout_high", "INTEGER DEFAULT 240"),
            ("timeout_medium", "INTEGER DEFAULT 480"),
            ("timeout_low", "INTEGER DEFAULT 1440")
        ]

        for col_name, col_type in new_config_columns:
            try:
                conn.execute(text(f"ALTER TABLE general_config ADD COLUMN {col_name} {col_type}"))
                print(f"general_config: {col_name} eklendi.")
            except Exception as e:
                print(f"general_config: {col_name} eklenemedi: {e}")

        conn.commit()
        print("Migrasyon tamamlandı.")

if __name__ == "__main__":
    migrate()
