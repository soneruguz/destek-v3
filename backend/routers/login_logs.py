from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models import UserLoginLog, User
import schemas
from auth import get_current_active_user

router = APIRouter(tags=["login-logs"])

# Kullanıcı giriş logu oluşturma
@router.post("/", response_model=schemas.UserLoginLogResponse)
def create_login_log(
    log: schemas.UserLoginLogCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Kullanıcının var olduğunu kontrol et
    user = db.query(User).filter(User.id == log.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # İstemci bilgilerini otomatik doldur
    if not log.ip_address:
        log.ip_address = request.client.host
    
    # User-Agent bilgisini al
    if not log.user_agent and "user-agent" in request.headers:
        log.user_agent = request.headers["user-agent"]
    
    # Yeni login logu oluştur
    db_log = UserLoginLog(
        user_id=log.user_id,
        ip_address=log.ip_address,
        user_agent=log.user_agent,
        device_info=log.device_info,
        login_status=log.login_status
    )
    
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# Kullanıcının kendi giriş loglarını getir
@router.get("/me/", response_model=List[schemas.UserLoginLogResponse])
def get_my_login_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    logs = db.query(UserLoginLog).filter(
        UserLoginLog.user_id == current_user.id
    ).order_by(desc(UserLoginLog.login_time)).offset(skip).limit(limit).all()
    
    return logs

# Tüm kullanıcıların giriş loglarını getir (sadece admin)
@router.get("/", response_model=List[schemas.UserLoginLogResponse])
def get_all_login_logs(
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)  # Sadece admin
):
    query = db.query(UserLoginLog)
    
    # Filtreleme işlemleri
    if user_id:
        query = query.filter(UserLoginLog.user_id == user_id)
    if start_date:
        query = query.filter(UserLoginLog.login_time >= start_date)
    if end_date:
        query = query.filter(UserLoginLog.login_time <= end_date)
    
    # Sıralama ve sayfalama
    logs = query.order_by(desc(UserLoginLog.login_time)).offset(skip).limit(limit).all()
    
    return logs

# Son 30 günlük istatistikler (sadece admin)
@router.get("/stats/")
def get_login_stats(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_active_user)
):
    # Son X gün için başlangıç tarihi
    start_date = datetime.now() - timedelta(days=days)
    
    # Toplam giriş sayısı
    total_logins = db.query(UserLoginLog).filter(
        UserLoginLog.login_time >= start_date
    ).count()
    
    # Başarılı girişler
    successful_logins = db.query(UserLoginLog).filter(
        UserLoginLog.login_time >= start_date,
        UserLoginLog.login_status == True
    ).count()
    
    # Başarısız girişler
    failed_logins = db.query(UserLoginLog).filter(
        UserLoginLog.login_time >= start_date,
        UserLoginLog.login_status == False
    ).count()
    
    # Benzersiz kullanıcı sayısı
    unique_users = db.query(UserLoginLog.user_id).filter(
        UserLoginLog.login_time >= start_date
    ).distinct().count()
    
    return {
        "total_logins": total_logins,
        "successful_logins": successful_logins,
        "failed_logins": failed_logins,
        "unique_users": unique_users,
        "period_days": days
    }
