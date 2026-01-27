from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_, case, extract
from typing import List, Optional
from datetime import datetime, timedelta
import csv
import io

from database import get_db
import models, schemas
from auth import get_current_active_user

router = APIRouter(tags=["reports"])

@router.get("/stats")
def get_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Genel istatistikleri döndürür.
    Admin tüm sistemi görür, diğerleri sadece kendi yetkileri dahilindekileri.
    """
    
    # Base query filters
    filters = []
    if start_date:
        filters.append(models.Ticket.created_at >= start_date)
    if end_date:
        filters.append(models.Ticket.created_at <= end_date)
        
    # Permission filters
    if not current_user.is_admin:
        # Standart kullanıcı filtreleri (basitleştirilmiş raporlama için sadece erişebildikleri)
        # Bu raporlama için karmaşık yetki kontrolü yerine temel departman/yetki kontrolü yapıyoruz
        access_filters = []
        
        # 1. Kendi oluşturdukları
        access_filters.append(models.Ticket.creator_id == current_user.id)
        
        # 2. Atandıkları
        access_filters.append(models.Ticket.assignee_id == current_user.id)
        
        # 3. Departman (yönetici ise tüm departman, değilse sadece genel)
        if current_user.department_id:
            dept_filter = [models.Ticket.department_id == current_user.department_id]
            if not current_user.role == models.UserRole.DEPARTMENT_ADMIN:
                # Normal kullanıcı departmanındaki gizli olmayan ve atanmamışları görebilir
                dept_filter.append(models.Ticket.is_private == False)
                dept_filter.append(models.Ticket.assignee_id == None)
            
            # Departman filtresini AND ile birleştirip access_filters'a ekle
            access_filters.append(and_(*dept_filter))
            
        filters.append(or_(*access_filters))

    # 1. Status Counts
    status_query = db.query(
        models.Ticket.status, func.count(models.Ticket.id)
    ).filter(*filters).group_by(models.Ticket.status)
    status_stats = dict(status_query.all())
    
    # 2. Priority Counts
    priority_query = db.query(
        models.Ticket.priority, func.count(models.Ticket.id)
    ).filter(*filters).group_by(models.Ticket.priority)
    priority_stats = dict(priority_query.all())
    
    # 3. Department Counts (Top 10)
    dept_query = db.query(
        models.Department.name, func.count(models.Ticket.id)
    ).join(models.Ticket).filter(*filters)\
     .group_by(models.Department.name)\
     .order_by(desc(func.count(models.Ticket.id)))\
     .limit(10)
    dept_stats = dict(dept_query.all())

    return {
        "status_distribution": status_stats,
        "priority_distribution": priority_stats,
        "department_distribution": dept_stats,
        "total_tickets": sum(status_stats.values())
    }

@router.post("/search")
def search_tickets(
    search_params: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Gelişmiş arama endpoint'i.
    search_params: {
        "query": str,
        "status": List[str],
        "priority": List[str],
        "department_ids": List[int],
        "user_ids": List[int],
        "start_date": str (ISO),
        "end_date": str (ISO)
    }
    """
    query = db.query(models.Ticket)
    
    # 1. Text Search
    if search_params.get("query"):
        q = f"%{search_params['query']}%"
        query = query.filter(
            or_(
                models.Ticket.title.ilike(q),
                models.Ticket.description.ilike(q)
            )
        )
        
    # 2. Filters
    if search_params.get("status"):
        query = query.filter(models.Ticket.status.in_(search_params["status"]))
        
    if search_params.get("priority"):
        query = query.filter(models.Ticket.priority.in_(search_params["priority"]))
        
    if search_params.get("department_ids"):
        query = query.filter(models.Ticket.department_id.in_(search_params["department_ids"]))
        
    if search_params.get("user_ids"):
        query = query.filter(or_(
            models.Ticket.creator_id.in_(search_params["user_ids"]),
            models.Ticket.assignee_id.in_(search_params["user_ids"])
        ))
        
    if search_params.get("start_date"):
        query = query.filter(models.Ticket.created_at >= search_params["start_date"])
        
    if search_params.get("end_date"):
        query = query.filter(models.Ticket.created_at <= search_params["end_date"])

    # 3. Permissions (Reuse logic from stats or apply manual filter)
    # Burada query seviyesinde filtreleme yapmak en performanslısı
    if not current_user.is_admin:
        access_conditions = [
            models.Ticket.creator_id == current_user.id,
            models.Ticket.assignee_id == current_user.id
        ]
        
        if current_user.department_id:
            dept_condition = [models.Ticket.department_id == current_user.department_id]
            if not current_user.role == models.UserRole.DEPARTMENT_ADMIN:
                dept_condition.append(models.Ticket.is_private == False)
                dept_condition.append(models.Ticket.assignee_id == None)
            access_conditions.append(and_(*dept_condition))
            
        query = query.filter(or_(*access_conditions))

    # Execute
    tickets = query.order_by(desc(models.Ticket.created_at)).limit(500).all()
    
    # Return minimal necessary data
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "created_at": t.created_at,
            "creator": t.creator.full_name if t.creator else "Unknown",
            "assignee": t.assignee.full_name if t.assignee else "Unassigned",
            "department": t.department.name if t.department else "Unknown"
        }
        for t in tickets
    ]

@router.post("/export")
def export_tickets(
    search_params: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Arama sonuçlarını CSV olarak dışa aktarır.
    """
    # Search logic reuse (Copy-paste for safety to ensure same filters apply)
    query = db.query(models.Ticket)
    
    # ... (Same filters as above) ...
    if search_params.get("query"):
        q = f"%{search_params['query']}%"
        query = query.filter(or_(models.Ticket.title.ilike(q), models.Ticket.description.ilike(q)))
    if search_params.get("status"):
        query = query.filter(models.Ticket.status.in_(search_params["status"]))
    if search_params.get("priority"):
        query = query.filter(models.Ticket.priority.in_(search_params["priority"]))
    if search_params.get("department_ids"):
        query = query.filter(models.Ticket.department_id.in_(search_params["department_ids"]))
    if search_params.get("user_ids"):
        query = query.filter(or_(models.Ticket.creator_id.in_(search_params["user_ids"]), models.Ticket.assignee_id.in_(search_params["user_ids"])))
    if search_params.get("start_date"):
        query = query.filter(models.Ticket.created_at >= search_params["start_date"])
    if search_params.get("end_date"):
        query = query.filter(models.Ticket.created_at <= search_params["end_date"])

    if not current_user.is_admin:
        access_conditions = [models.Ticket.creator_id == current_user.id, models.Ticket.assignee_id == current_user.id]
        if current_user.department_id:
            dept_condition = [models.Ticket.department_id == current_user.department_id]
            if not current_user.role == models.UserRole.DEPARTMENT_ADMIN:
                dept_condition.append(models.Ticket.is_private == False)
                dept_condition.append(models.Ticket.assignee_id == None)
            access_conditions.append(and_(*dept_condition))
        query = query.filter(or_(*access_conditions))

    tickets = query.order_by(desc(models.Ticket.created_at)).limit(1000).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["ID", "Başlık", "Durum", "Öncelik", "Departman", "Oluşturan", "Atanan", "Oluşturma Tarihi"])
    
    # Rows
    for t in tickets:
        writer.writerow([
            t.id,
            t.title,
            t.status,
            t.priority,
            t.department.name if t.department else "-",
            t.creator.full_name if t.creator else "-",
            t.assignee.full_name if t.assignee else "-",
            t.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])
        
    output.seek(0)
    

@router.post("/personnel-stats")
def get_personnel_stats(
    search_params: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Personel bazlı detaylı raporlama endpoint'i.
    search_params aynı filtreleri destekler.
    Dönüş:
    - creators: En çok talep açanlar
    - resolvers: En çok talep çözenler (ort. süre ile)
    """
    
    # 1. Base Filters (search_tickets ile aynı mantık)
    filters = []
    
    if search_params.get("start_date"):
        filters.append(models.Ticket.created_at >= search_params["start_date"])
    if search_params.get("end_date"):
        filters.append(models.Ticket.created_at <= search_params["end_date"])
    if search_params.get("department_ids"):
        filters.append(models.Ticket.department_id.in_(search_params["department_ids"]))
        
    # Permission check
    if not current_user.is_admin:
        # Sadece kendi departmanını görebilir veya kısıtlı
        if current_user.department_id:
            filters.append(models.Ticket.department_id == current_user.department_id)
        else:
            # Departmanı yoksa sadece kendisi
            filters.append(or_(
                models.Ticket.creator_id == current_user.id,
                models.Ticket.assignee_id == current_user.id
            ))

    # 2. Creators Query (Talep Açanlar)
    creators_query = db.query(
        models.User.id,
        models.User.full_name,
        models.Department.name.label("department_name"),
        func.count(models.Ticket.id).label("total_tickets"),
        func.sum(case((models.Ticket.priority == 'urgent', 1), else_=0)).label("urgent_count"),
        func.sum(case((models.Ticket.priority == 'high', 1), else_=0)).label("high_count"),
        func.sum(case((models.Ticket.status == 'open', 1), else_=0)).label("open_count"),
        func.sum(case((models.Ticket.status == 'closed', 1), else_=0)).label("closed_count"),
    ).join(models.User, models.Ticket.creator_id == models.User.id)\
     .outerjoin(models.Department, models.User.department_id == models.Department.id)\
     .filter(*filters)\
     .group_by(models.User.id, models.User.full_name, models.Department.name)\
     .order_by(desc("total_tickets"))
     
    creators_data = creators_query.all()
    
    # 3. Resolvers Query (Talep Çözenler - Atanan Kişiler)
    # Kapalı talepler üzerinden ortalama çözüm süresi hesapla
    
    resolvers_query = db.query(
        models.User.id,
        models.User.full_name,
        models.Department.name.label("department_name"),
        func.count(models.Ticket.id).label("total_assigned"),
        func.sum(case((models.Ticket.status == 'closed', 1), else_=0)).label("total_resolved"),
        # Ortalama çözüm süresi (saniye cinsinden) - Sadece kapalı talepler için
        func.avg(
            case(
                (models.Ticket.status == 'closed', 
                 extract('epoch', models.Ticket.updated_at) - extract('epoch', models.Ticket.created_at)),
                else_=None
            )
        ).label("avg_resolution_seconds")
    ).join(models.User, models.Ticket.assignee_id == models.User.id)\
     .outerjoin(models.Department, models.User.department_id == models.Department.id)\
     .filter(*filters)\
     .group_by(models.User.id, models.User.full_name, models.Department.name)\
     .order_by(desc("total_resolved"))
     
    resolvers_data = resolvers_query.all()
    
    return {
        "creators": [
            {
                "id": r.id,
                "full_name": r.full_name,
                "department": r.department_name or "Belirtilmemiş",
                "total_tickets": r.total_tickets,
                "priority_breakdown": {
                    "urgent": r.urgent_count,
                    "high": r.high_count
                },
                "status_breakdown": {
                    "open": r.open_count,
                    "closed": r.closed_count
                }
            }
            for r in creators_data
        ],
        "resolvers": [
            {
                "id": r.id,
                "full_name": r.full_name,
                "department": r.department_name or "Belirtilmemiş",
                "total_assigned": r.total_assigned,
                "total_resolved": r.total_resolved,
                "avg_resolution_time": round(r.avg_resolution_seconds / 3600, 1) if r.avg_resolution_seconds else 0  # Saat cinsinden
            }
            for r in resolvers_data
        ]
    }
