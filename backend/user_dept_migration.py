from database import engine, get_db
from models import User, Department, user_department
from sqlalchemy.orm import Session

def assign_ldapreader_to_department():
    """ldapreader kullanıcısını varsayılan departmana ekler."""
    print("ldapreader kullanıcısını departmana ekleme işlemi başlatılıyor...")
    
    # DB Session al
    db = next(get_db())
    
    # ldapreader kullanıcısını bul
    ldapreader = db.query(User).filter(User.username == "ldapreader").first()
    if not ldapreader:
        print("ldapreader kullanıcısı bulunamadı.")
        return
    
    # Genel departmanı bul (varsayılan departman)
    general_dept = db.query(Department).filter(Department.name == "Genel").first()
    if not general_dept:
        print("Genel departman bulunamadı. Yeni departman oluşturuluyor...")
        general_dept = Department(name="Genel", description="Genel departman")
        db.add(general_dept)
        db.commit()
        db.refresh(general_dept)
    
    # Kullanıcı-departman ilişkisini kontrol et
    relation = db.execute(
        user_department.select().where(
            user_department.c.user_id == ldapreader.id,
            user_department.c.department_id == general_dept.id
        )
    ).fetchone()
    
    # İlişki yoksa ekle
    if not relation:
        print(f"ldapreader kullanıcısı {general_dept.name} departmanına ekleniyor...")
        db.execute(
            user_department.insert().values(
                user_id=ldapreader.id,
                department_id=general_dept.id
            )
        )
        db.commit()
        print("İşlem tamamlandı.")
    else:
        print(f"ldapreader kullanıcısı zaten {general_dept.name} departmanına eklenmiş.")

if __name__ == "__main__":
    assign_ldapreader_to_department()
