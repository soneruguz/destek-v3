from database import get_db, engine
from sqlalchemy.orm import Session
from sqlalchemy import text
import models

def assign_ldapreader_to_department():
    """LDAP Reader kullanıcısını bir departmana atar"""
    db = next(get_db())
    print("LDAP Reader kullanıcısı için departman atama işlemi başlatılıyor...")
    
    # LDAP Reader kullanıcısını bul
    ldapreader = db.query(models.User).filter(models.User.username == "ldapreader").first()
    if not ldapreader:
        print("ldapreader kullanıcısı bulunamadı.")
        return
    
    print(f"LDAP Reader kullanıcısı bulundu. ID: {ldapreader.id}")
    
    # Genel departmanı bul (veya oluştur)
    general_dept = db.query(models.Department).filter(models.Department.name == "Genel").first()
    if not general_dept:
        print("Genel departman bulunamadı. Oluşturuluyor...")
        general_dept = models.Department(name="Genel", description="Genel departman")
        db.add(general_dept)
        db.commit()
        db.refresh(general_dept)
    
    print(f"Genel departman bulundu. ID: {general_dept.id}")
    
    # Kullanıcının mevcut departman ilişkilerini kontrol et
    user_dept_relation = db.execute(text(
        "SELECT * FROM user_department WHERE user_id = :user_id"
    ), {"user_id": ldapreader.id}).fetchall()
    
    if not user_dept_relation:
        print("LDAP Reader kullanıcısı herhangi bir departmana atanmamış. Atama yapılıyor...")
        # Kullanıcı-departman ilişkisi oluştur
        db.execute(text(
            "INSERT INTO user_department (user_id, department_id) VALUES (:user_id, :dept_id)"
        ), {"user_id": ldapreader.id, "dept_id": general_dept.id})
        db.commit()
        print("LDAP Reader kullanıcısı Genel departmana atandı.")
    else:
        print(f"LDAP Reader kullanıcısı zaten departmanlara atanmış: {user_dept_relation}")
    
    # Kullanıcının atanmış olduğu biletleri kontrol et
    assigned_tickets = db.query(models.Ticket).filter(models.Ticket.assignee_id == ldapreader.id).all()
    print(f"LDAP Reader kullanıcısına atanmış {len(assigned_tickets)} bilet bulundu:")
    for ticket in assigned_tickets:
        print(f"  - Bilet #{ticket.id}: {ticket.title} (Durum: {ticket.status})")

if __name__ == "__main__":
    assign_ldapreader_to_department()
