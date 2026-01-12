from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from typing import List, Optional
import models
from database import get_db
from schemas import NotificationCreate, NotificationResponse, NotificationSettingsUpdate, NotificationSettingsResponse
from sqlalchemy import text
# from utils.notifications import create_notification
from auth import get_current_active_user

router = APIRouter(
    tags=["notifications"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[NotificationResponse])
@router.get("", response_model=List[NotificationResponse])  # Trailing slash olmadan da çalışsın
async def read_notifications(
    skip: int = 0, 
    limit: int = 100,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Kullanıcının bildirimlerini getir"""
    try:
        query = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
        
        if unread_only:
            query = query.filter(models.Notification.is_read == False)
        
        notifications = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
        return notifications
    except Exception as e:
        # Debug için boş liste döndür
        return []

@router.get("/unread-count", response_model=int)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Okunmamış bildirim sayısını getir"""
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    return count

@router.get("/settings", response_model=NotificationSettingsResponse)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Kullanıcının bildirim ayarlarını getir"""
    try:
        # Eksik kolon varsa eklemeye çalış (ör: ticket_attachment)
        try:
            db.execute(text("ALTER TABLE notification_settings ADD COLUMN ticket_attachment BOOLEAN DEFAULT TRUE"))
            db.commit()
        except Exception:
            db.rollback()

        notification_settings = db.query(models.NotificationSettings).filter(
            models.NotificationSettings.user_id == current_user.id
        ).first()
        
        if not notification_settings:
            # Default ayarlar oluştur
            notification_settings = models.NotificationSettings(
                user_id=current_user.id,
                email_notifications=True,
                browser_notifications=False,
                ticket_assigned=True,
                ticket_updated=True,
                ticket_commented=True,
                ticket_attachment=True
            )
            db.add(notification_settings)
            db.commit()
            db.refresh(notification_settings)
        
        return NotificationSettingsResponse.from_orm(notification_settings)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bildirim ayarları alınırken hata oluştu: {str(e)}"
        )

@router.get("/{notification_id}", response_model=NotificationResponse)
async def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Belirli bir bildirimi getir"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return notification

@router.post("/{notification_id}/mark-read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Bir bildirimi okundu olarak işaretle"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    
    return notification

@router.post("/mark-all-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Tüm bildirimleri okundu olarak işaretle"""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"status": "success"}

@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Bir bildirimi sil"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"status": "success"}

@router.put("/settings", response_model=NotificationSettingsResponse)
def update_notification_settings(
    settings: NotificationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Kullanıcının bildirim ayarlarını güncelle"""
    try:
        # Eksik kolon varsa eklemeye çalış (ör: ticket_attachment)
        try:
            db.execute(text("ALTER TABLE notification_settings ADD COLUMN ticket_attachment BOOLEAN DEFAULT TRUE"))
            db.commit()
        except Exception:
            db.rollback()
        
        # Mevcut ayarları kontrol et
        notification_settings = db.query(models.NotificationSettings).filter(
            models.NotificationSettings.user_id == current_user.id
        ).first()
        
        if not notification_settings:
            # Yeni ayar oluştur
            notification_settings = models.NotificationSettings(
                user_id=current_user.id,
                email_notifications=settings.email_notifications,
                browser_notifications=settings.browser_notifications,
                ticket_assigned=settings.ticket_assigned,
                ticket_updated=settings.ticket_updated,
                ticket_commented=settings.ticket_commented,
                ticket_attachment=settings.ticket_attachment
            )
            db.add(notification_settings)
        else:
            # Mevcut ayarları güncelle
            notification_settings.email_notifications = settings.email_notifications
            notification_settings.browser_notifications = settings.browser_notifications
            notification_settings.ticket_assigned = settings.ticket_assigned
            notification_settings.ticket_updated = settings.ticket_updated
            notification_settings.ticket_commented = settings.ticket_commented
            notification_settings.ticket_attachment = settings.ticket_attachment
        
        db.commit()
        db.refresh(notification_settings)
        
        return NotificationSettingsResponse.from_orm(notification_settings)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bildirim ayarları güncellenirken hata oluştu: {str(e)}"
        )

@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def update_push_token(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Kullanıcının tarayıcı bildirim tokenini güncelle"""
    current_user.browser_notification_token = token
    db.commit()
    
    return {"status": "success"}

@router.post("/push-subscription", status_code=status.HTTP_204_NO_CONTENT)
async def save_push_subscription(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Kullanıcının Web Push aboneliğini kaydet.
    Bu, tarayıcıdan gelen PushSubscription nesnesini kaydeder.
    """
    subscription = data.get("subscription")
    if not subscription:
        raise HTTPException(status_code=400, detail="Abonelik bilgisi eksik")
    
    # Kullanıcının browser_notification_token alanına abonelik bilgisini kaydet
    current_user.browser_notification_token = subscription
    db.commit()
    
    return {"status": "success"}

@router.delete("/push-subscription", status_code=status.HTTP_204_NO_CONTENT)
async def delete_push_subscription(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    Kullanıcının Web Push aboneliğini sil.
    Kullanıcı bildirim almak istemediğinde çağrılır.
    """
    # Kullanıcının browser_notification_token alanını temizle
    current_user.browser_notification_token = None
    db.commit()
    
    return {"status": "success"}

# Public endpoints (no auth required) - Bu endpoint'ler authentication gerektirmez
@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """VAPID public key'i döndür - authentication gerektirmez"""
    return {"publicKey": "BLBz4TKkKHRLdLJ36UNT7_eLJHLEBB1CPxNn3R1MytaR9jdJvEcTNWHo7qV_sIHYdBK7-xF4Wp9c7yJKPsOI9LA"}