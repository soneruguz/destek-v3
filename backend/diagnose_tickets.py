from database import get_db
import models
from sqlalchemy import text

def diagnose_ticket_system():
    """Bilet sistemi, kullanıcılar ve departman ilişkilerini teşhis eder"""
    db = next(get_db())
    
    print("\n=== KULLANICILAR ===")
    users = db.query(models.User).all()
    for user in users:
        print(f"Kullanıcı #{user.id}: {user.username} ({user.full_name}) - Admin: {user.is_admin}, LDAP: {user.is_ldap}")
    
    print("\n=== LDAP READER KULLANICISI ===")
    ldapreader = db.query(models.User).filter(models.User.username == "ldapreader").first()
    if ldapreader:
        print(f"LDAP Reader kullanıcısı bulundu. ID: {ldapreader.id}")
        
        # Kullanıcı-departman ilişkisini kontrol et
        user_depts = db.execute(text(
            "SELECT d.id, d.name FROM departments d JOIN user_department ud ON d.id = ud.department_id WHERE ud.user_id = :user_id"
        ), {"user_id": ldapreader.id}).fetchall()
        
        if user_depts:
            print(f"LDAP Reader'ın departmanları:")
            for dept_id, dept_name in user_depts:
                print(f"  - Departman #{dept_id}: {dept_name}")
        else:
            print("LDAP Reader herhangi bir departmana atanmamış!")
            
            # Departman yoksa ekleyelim
            general_dept = db.query(models.Department).filter(models.Department.name == "Genel").first()
            if not general_dept:
                general_dept = models.Department(name="Genel", description="Genel departman")
                db.add(general_dept)
                db.commit()
                db.refresh(general_dept)
                
            db.execute(text(
                "INSERT INTO user_department (user_id, department_id) VALUES (:user_id, :dept_id)"
            ), {"user_id": ldapreader.id, "dept_id": general_dept.id})
            db.commit()
            print(f"LDAP Reader Genel departmanına eklendi.")
    else:
        print("LDAP Reader kullanıcısı bulunamadı!")
    
    print("\n=== BİLETLER ===")
    tickets = db.query(models.Ticket).all()
    for ticket in tickets:
        creator = db.query(models.User).filter(models.User.id == ticket.creator_id).first()
        creator_name = creator.username if creator else "Bilinmeyen"
        
        assignee = db.query(models.User).filter(models.User.id == ticket.assignee_id).first()
        assignee_name = assignee.username if assignee else "Atanmamış"
        
        department = db.query(models.Department).filter(models.Department.id == ticket.department_id).first()
        department_name = department.name if department else "Bilinmeyen"
        
        print(f"Bilet #{ticket.id}: {ticket.title}")
        print(f"  - Oluşturan: {creator_name} (ID: {ticket.creator_id})")
        print(f"  - Atanan: {assignee_name} (ID: {ticket.assignee_id})")
        print(f"  - Departman: {department_name} (ID: {ticket.department_id})")
        print(f"  - Durum: {ticket.status}, Gizli: {ticket.is_private}")
    
    # LDAP Reader'a atanan biletleri özel olarak kontrol et
    if ldapreader:
        print("\n=== LDAP READER'A ATANAN BİLETLER ===")
        assigned_tickets = db.query(models.Ticket).filter(models.Ticket.assignee_id == ldapreader.id).all()
        
        if assigned_tickets:
            for ticket in assigned_tickets:
                print(f"Bilet #{ticket.id}: {ticket.title} (Durum: {ticket.status})")
                # Bilet atama bilgisini onar - güvenlik için kontrol edelim
                if ticket.assignee_id != ldapreader.id:
                    db.execute(text(
                        "UPDATE tickets SET assignee_id = :user_id WHERE id = :ticket_id"
                    ), {"user_id": ldapreader.id, "ticket_id": ticket.id})
                    db.commit()
                    print(f"  - Bilet #{ticket.id} için atama ilişkisi onarıldı!")
        else:
            print("LDAP Reader'a atanmış bilet bulunamadı!")

if __name__ == "__main__":
    diagnose_ticket_system()
