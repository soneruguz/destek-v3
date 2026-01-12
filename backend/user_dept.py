from database import get_db, engine
import models
from sqlalchemy.orm import Session
from sqlalchemy import text

def ensure_user_department():
    """Tüm kullanıcıların en az bir departmana atanmasını sağlar."""
    db = next(get_db())
    
    # LDAP kullanıcılarını bul
    ldap_users = db.query(models.User).filter(models.User.is_ldap == True).all()
    
    # Genel departmanı bul, yoksa oluştur
    general_dept = db.query(models.Department).filter(models.Department.name == "Genel").first()
    if not general_dept:
        general_dept = models.Department(name="Genel", description="Genel departman")
        db.add(general_dept)
        db.commit()
        db.refresh(general_dept)
        print(f"Yeni 'Genel' departmanı oluşturuldu. ID: {general_dept.id}")
    
    for user in ldap_users:
        # Kullanıcının herhangi bir departmana atanıp atanmadığını kontrol et
        result = db.execute(text(
            "SELECT 1 FROM user_department WHERE user_id = :user_id LIMIT 1"
        ), {"user_id": user.id}).first()
        
        if not result:
            # Kullanıcıyı Genel departmana ata
            db.execute(text(
                "INSERT INTO user_department (user_id, department_id) VALUES (:user_id, :dept_id)"
            ), {"user_id": user.id, "dept_id": general_dept.id})
            
            db.commit()
            print(f"Kullanıcı {user.username} (ID: {user.id}) 'Genel' departmanına atandı")
        else:
            print(f"Kullanıcı {user.username} (ID: {user.id}) zaten bir departmana atanmış")
    
    # Biletlerin ilişkilerini kontrol et
    tickets = db.query(models.Ticket).all()
    for ticket in tickets:
        print(f"Bilet ID: {ticket.id}, Creator: {ticket.creator_id}, Assignee: {ticket.assignee_id}, Department: {ticket.department_id}")

if __name__ == "__main__":
    ensure_user_department()
