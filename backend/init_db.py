from database import engine, get_db
from models import Base, User, Department
from passlib.context import CryptContext
import sys

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def init_database():
    print("Creating database tables...")
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Get a DB session
    db = next(get_db())
    
    # Check if admin user already exists
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
    
    print("Database initialization completed.")

if __name__ == "__main__":
    init_database()
