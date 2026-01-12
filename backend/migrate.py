from database import engine, get_db
from models import Base, User, Department, Ticket, Attachment
from passlib.context import CryptContext
import sys
from sqlalchemy import text
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def migrate_database():
    print("Migrating database...")
    
    # Önce tüm tabloları oluştur
    Base.metadata.create_all(bind=engine)
    
    # DB Session al
    db = next(get_db())
    
    # Eksik sütunları kontrol et ve ekle
    try:
        # Engine ile doğrudan bağlantı al
        conn = engine.connect()
        
        # Tickets tablosundaki sütunları kontrol et
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets'"))
        columns = [row[0] for row in result]
        
        # Eksik sütunları ekle - tickets tablosu
        if 'assignee_id' not in columns:
            print("Adding assignee_id column to tickets table...")
            conn.execute(text("ALTER TABLE tickets ADD COLUMN assignee_id INTEGER REFERENCES users(id)"))
            
        if 'teos_id' not in columns:
            print("Adding teos_id column to tickets table...")
            conn.execute(text("ALTER TABLE tickets ADD COLUMN teos_id VARCHAR"))
            
        if 'citizenship_no' not in columns:
            print("Adding citizenship_no column to tickets table...")
            conn.execute(text("ALTER TABLE tickets ADD COLUMN citizenship_no VARCHAR"))
            
        if 'is_private' not in columns:
            print("Adding is_private column to tickets table...")
            conn.execute(text("ALTER TABLE tickets ADD COLUMN is_private BOOLEAN DEFAULT FALSE"))
        
        # Attachments tablosunu kontrol et
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_name='attachments'
        """))
        
        attachments_exists = bool(result.fetchone())
        
        if attachments_exists:
            # Attachments tablosundaki sütunları kontrol et
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'attachments'"))
            attachment_columns = [row[0] for row in result]
            
            # Eksik sütunları ekle - attachments tablosu
            if 'file_size' not in attachment_columns:
                print("Adding file_size column to attachments table...")
                conn.execute(text("ALTER TABLE attachments ADD COLUMN file_size INTEGER"))
            
            if 'content_type' not in attachment_columns:
                print("Adding content_type column to attachments table...")
                conn.execute(text("ALTER TABLE attachments ADD COLUMN content_type VARCHAR"))
        
        # Ticket share tablosunu kontrol et
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' AND table_name='ticket_share'
        """))
        
        ticket_share_exists = bool(result.fetchone())
        
        if not ticket_share_exists:
            print("Creating ticket_share table...")
            conn.execute(text("""
                CREATE TABLE ticket_share (
                    ticket_id INTEGER REFERENCES tickets(id),
                    user_id INTEGER REFERENCES users(id),
                    department_id INTEGER REFERENCES departments(id),
                    PRIMARY KEY (ticket_id, COALESCE(user_id, 0), COALESCE(department_id, 0))
                )
            """))
        
        # Değişiklikleri commit et
        conn.commit()
        
    except Exception as e:
        print(f"Error updating database schema: {e}")
        
    # Yükleme dizinini oluştur
    os.makedirs("uploads", exist_ok=True)
    
    # Admin kullanıcısını kontrol et
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print("Admin user already exists.")
    else:
        print("Creating admin user...")
        # Create admin user with password 'admin'
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
        
        # Create a default department
        default_dept = Department(
            name="Genel",
            description="Genel destek talepleri departmanı"
        )
        db.add(default_dept)
        
        # Commit changes
        db.commit()
        print("Admin user and default department created successfully.")
    
    print("Database migration completed.")

if __name__ == "__main__":
    migrate_database()
