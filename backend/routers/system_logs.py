"""
Sistem Logları Router
- Log listeleme (filtreleme ile)
- Log export (JSON/CSV)
- Log temizleme (belirli tarihten önceki logları sil)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import Optional, List
from datetime import datetime, timedelta
from database import get_db
import models
from auth import get_current_active_user
import json
import csv
import io
import gzip
from pydantic import BaseModel

router = APIRouter(tags=["system-logs"])


class SystemLogResponse(BaseModel):
    id: int
    category: str
    action: str
    user_id: Optional[int]
    username: Optional[str]
    target_type: Optional[str]
    target_id: Optional[int]
    target_name: Optional[str]
    details: Optional[dict]
    status: str
    error_message: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_log(cls, log: models.SystemLog):
        details = None
        if log.details:
            try:
                details = json.loads(log.details)
            except:
                details = {"raw": log.details}
        
        return cls(
            id=log.id,
            category=log.category,
            action=log.action,
            user_id=log.user_id,
            username=log.username,
            target_type=log.target_type,
            target_id=log.target_id,
            target_name=log.target_name,
            details=details,
            status=log.status,
            error_message=log.error_message,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            created_at=log.created_at
        )


class LogStats(BaseModel):
    total_logs: int
    categories: dict
    statuses: dict
    today_count: int
    last_7_days_count: int


@router.get("/", response_model=dict)
def get_system_logs(
    category: Optional[str] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    target_type: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Sistem loglarını listele (sadece admin)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    query = db.query(models.SystemLog)
    
    # Filtreler
    if category:
        query = query.filter(models.SystemLog.category == category)
    if action:
        query = query.filter(models.SystemLog.action == action)
    if status:
        query = query.filter(models.SystemLog.status == status)
    if user_id:
        query = query.filter(models.SystemLog.user_id == user_id)
    if target_type:
        query = query.filter(models.SystemLog.target_type == target_type)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.SystemLog.username.ilike(search_term),
                models.SystemLog.target_name.ilike(search_term),
                models.SystemLog.details.ilike(search_term),
                models.SystemLog.error_message.ilike(search_term)
            )
        )
    if start_date:
        query = query.filter(models.SystemLog.created_at >= start_date)
    if end_date:
        query = query.filter(models.SystemLog.created_at <= end_date)
    
    # Toplam sayı
    total = query.count()
    
    # Sayfalama ve sıralama
    logs = query.order_by(desc(models.SystemLog.created_at))\
                .offset((page - 1) * page_size)\
                .limit(page_size)\
                .all()
    
    return {
        "logs": [SystemLogResponse.from_log(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/stats", response_model=LogStats)
def get_log_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Log istatistiklerini getir"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    import pytz
    istanbul_tz = pytz.timezone('Europe/Istanbul')
    now = datetime.now(istanbul_tz).replace(tzinfo=None)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    
    total = db.query(models.SystemLog).count()
    
    # Kategorilere göre sayı
    from sqlalchemy import func
    categories = {}
    cat_results = db.query(
        models.SystemLog.category, 
        func.count(models.SystemLog.id)
    ).group_by(models.SystemLog.category).all()
    for cat, count in cat_results:
        categories[cat] = count
    
    # Durumlara göre sayı
    statuses = {}
    status_results = db.query(
        models.SystemLog.status,
        func.count(models.SystemLog.id)
    ).group_by(models.SystemLog.status).all()
    for st, count in status_results:
        statuses[st] = count
    
    today_count = db.query(models.SystemLog)\
        .filter(models.SystemLog.created_at >= today_start).count()
    
    last_7_days = db.query(models.SystemLog)\
        .filter(models.SystemLog.created_at >= week_ago).count()
    
    return LogStats(
        total_logs=total,
        categories=categories,
        statuses=statuses,
        today_count=today_count,
        last_7_days_count=last_7_days
    )


@router.get("/categories")
def get_log_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Mevcut log kategorilerini getir"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    from sqlalchemy import func
    categories = db.query(models.SystemLog.category).distinct().all()
    actions = db.query(models.SystemLog.action).distinct().all()
    target_types = db.query(models.SystemLog.target_type).filter(
        models.SystemLog.target_type.isnot(None)
    ).distinct().all()
    
    return {
        "categories": [c[0] for c in categories],
        "actions": [a[0] for a in actions],
        "target_types": [t[0] for t in target_types]
    }


@router.get("/export")
def export_logs(
    format: str = Query("json", regex="^(json|csv)$"),
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    compress: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Logları export et (JSON veya CSV, opsiyonel gzip sıkıştırma)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    query = db.query(models.SystemLog)
    
    if category:
        query = query.filter(models.SystemLog.category == category)
    if start_date:
        query = query.filter(models.SystemLog.created_at >= start_date)
    if end_date:
        query = query.filter(models.SystemLog.created_at <= end_date)
    
    logs = query.order_by(models.SystemLog.created_at).all()
    
    # Log export işlemini kaydet
    from utils.system_logger import log_system, LogAction
    log_system(
        db=db,
        action=LogAction.EXPORT,
        user_id=current_user.id,
        username=current_user.username,
        details={
            "format": format,
            "category": category,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "log_count": len(logs),
            "compressed": compress
        }
    )
    
    if format == "json":
        data = []
        for log in logs:
            data.append({
                "id": log.id,
                "category": log.category,
                "action": log.action,
                "user_id": log.user_id,
                "username": log.username,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "target_name": log.target_name,
                "details": log.details,
                "status": log.status,
                "error_message": log.error_message,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        
        content = json.dumps(data, ensure_ascii=False, indent=2)
        filename = f"system_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        media_type = "application/json"
        
    else:  # CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "Kategori", "Aksiyon", "Kullanıcı ID", "Kullanıcı", 
            "Hedef Tür", "Hedef ID", "Hedef Ad", "Detaylar", "Durum",
            "Hata Mesajı", "IP Adresi", "User Agent", "Tarih"
        ])
        
        for log in logs:
            writer.writerow([
                log.id, log.category, log.action, log.user_id, log.username,
                log.target_type, log.target_id, log.target_name, log.details,
                log.status, log.error_message, log.ip_address, log.user_agent,
                log.created_at.isoformat() if log.created_at else ""
            ])
        
        content = output.getvalue()
        filename = f"system_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        media_type = "text/csv"
    
    if compress:
        compressed = gzip.compress(content.encode('utf-8'))
        return Response(
            content=compressed,
            media_type="application/gzip",
            headers={
                "Content-Disposition": f"attachment; filename={filename}.gz"
            }
        )
    else:
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )


@router.delete("/cleanup")
def cleanup_old_logs(
    days_to_keep: int = Query(90, ge=7, le=365, description="Son kaç günün loglarını tut"),
    category: Optional[str] = None,
    export_before_delete: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Eski logları temizle (opsiyonel export sonrası)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    import pytz
    istanbul_tz = pytz.timezone('Europe/Istanbul')
    cutoff_date = datetime.now(istanbul_tz).replace(tzinfo=None) - timedelta(days=days_to_keep)
    
    query = db.query(models.SystemLog).filter(models.SystemLog.created_at < cutoff_date)
    if category:
        query = query.filter(models.SystemLog.category == category)
    
    count_to_delete = query.count()
    
    if count_to_delete == 0:
        return {"message": "Silinecek log bulunamadı", "deleted_count": 0}
    
    # Export before delete (eğer istenirse)
    export_info = None
    if export_before_delete and count_to_delete > 0:
        logs_to_export = query.all()
        export_data = []
        for log in logs_to_export:
            export_data.append({
                "id": log.id,
                "category": log.category,
                "action": log.action,
                "username": log.username,
                "target_type": log.target_type,
                "target_name": log.target_name,
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        export_info = {
            "exported_count": len(export_data),
            "cutoff_date": cutoff_date.isoformat()
        }
    
    # Silme işlemi
    deleted = query.delete(synchronize_session=False)
    db.commit()
    
    # Temizlik işlemini logla
    from utils.system_logger import log_system, LogAction
    log_system(
        db=db,
        action="cleanup",
        user_id=current_user.id,
        username=current_user.username,
        details={
            "days_kept": days_to_keep,
            "cutoff_date": cutoff_date.isoformat(),
            "deleted_count": deleted,
            "category_filter": category,
            "exported": export_before_delete
        }
    )
    
    return {
        "message": f"{deleted} log kaydı silindi",
        "deleted_count": deleted,
        "cutoff_date": cutoff_date.isoformat(),
        "export_info": export_info
    }
