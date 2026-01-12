from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models, schemas
from auth import get_current_active_user

router = APIRouter(tags=["departments"])

@router.post("/", response_model=schemas.Department)
def create_department(
    department: schemas.DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Sadece yöneticiler departman oluşturabilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler departman oluşturabilir")
    
    # Aynı isimde departman var mı kontrol et
    db_department = db.query(models.Department).filter(models.Department.name == department.name).first()
    if db_department:
        raise HTTPException(status_code=400, detail="Bu isimde bir departman zaten var")
    
    new_department = models.Department(
        name=department.name,
        description=department.description,
        manager_id=department.manager_id
    )
    
    db.add(new_department)
    db.commit()
    db.refresh(new_department)
    return new_department

@router.get("/", response_model=List[schemas.Department])
def get_departments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    departments = db.query(models.Department).all()
    return [schemas.Department.from_orm(d) for d in departments]

@router.get("/{department_id}", response_model=schemas.Department)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Departman bulunamadı")
    return department

@router.put("/{department_id}", response_model=schemas.Department)
def update_department(
    department_id: int,
    department_update: schemas.DepartmentBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Sadece yöneticiler departman güncelleyebilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler departman güncelleyebilir")
    
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Departman bulunamadı")
    
    # Güncelleme işlemi
    department.name = department_update.name
    department.description = department_update.description
    department.manager_id = department_update.manager_id
    
    db.commit()
    db.refresh(department)
    return department

@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Sadece yöneticiler departman silebilir
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Sadece yöneticiler departman silebilir")
    
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Departman bulunamadı")
    
    # Departmanın kullanıldığı talepleri kontrol et
    tickets = db.query(models.Ticket).filter(models.Ticket.department_id == department_id).count()
    if tickets > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Bu departman {tickets} adet destek talebinde kullanılıyor. Silmek için önce talepleri başka bir departmana taşıyın."
        )
    
    db.delete(department)
    db.commit()
    return None
