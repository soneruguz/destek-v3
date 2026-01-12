from fastapi import BackgroundTasks, Depends
from sqlalchemy.orm import Session
import models
import schemas
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import requests
import json
from typing import List, Optional, Dict, Any
from database import get_db
from pywebpush import webpush, WebPushException
import base64

# E-posta ayarları
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.example.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "user@example.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "password")
EMAIL_FROM = os.getenv("EMAIL_FROM", "destek@example.com")
APPLICATION_URL = os.getenv("APPLICATION_URL", "http://localhost:3000")

# VAPID anahtarları - Bunları uygulamanızın .env dosyasında saklamalısınız
# Bu anahtarlar örnek amaçlıdır, kendi uygulamanız için yeni anahtarlar oluşturmalısınız
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "MIGEAgEAMBAGByqGSM49AgEGBSuBBAAKBG0wawIBAQQgC0PIMt63L9QWRIi_r4PTYYmwqvXBKV9MtCTJPyLE0uOhRANCAATBFnKFCH4UrQzWng09FoHlMC5K0lolA1iiQh8BkMhU8qgYP8NyKKVg0m0NgCW-cO1auL0HEpQrUwX2VGiuYGE2")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "BLBz4TKkKHRLdLJ36UNT7_eLJHLEBB1CPxNn3R1MytaR9jdJvEcTNWHo7qV_sIHYdBK7-xF4Wp9c7yJKPsOI9LA")
VAPID_CLAIMS = {
    "sub": f"mailto:{EMAIL_FROM}"
}

async def create_notification(
    db: Session,
    user_id: int,
    notification_type: schemas.NotificationTypeEnum,
    title: str,
    message: str,
    related_id: int,
    background_tasks: Optional[BackgroundTasks] = None
):
    """
    Yeni bildirim oluşturur ve kullanıcının tercihlerine göre
    bildirimi gönderir (e-posta, tarayıcı push bildirim vb.)
    """
    # Kullanıcının bildirim ayarlarını kontrol et
    settings = db.query(models.NotificationSettings).filter(
        models.NotificationSettings.user_id == user_id
    ).first()
    
    # Ayarlar yoksa varsayılan ayarları oluştur
    if not settings:
        settings = models.NotificationSettings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    # Bildirim türüne göre tercihleri kontrol et
    should_notify = False
    
    if notification_type == schemas.NotificationTypeEnum.TICKET_CREATED and settings.notify_ticket_created:
        should_notify = True
    elif notification_type == schemas.NotificationTypeEnum.TICKET_UPDATED and settings.notify_ticket_updated:
        should_notify = True
    elif notification_type == schemas.NotificationTypeEnum.TICKET_ASSIGNED and settings.notify_ticket_assigned:
        should_notify = True
    elif notification_type == schemas.NotificationTypeEnum.TICKET_COMMENTED and settings.notify_ticket_commented:
        should_notify = True
    elif notification_type == schemas.NotificationTypeEnum.WIKI_CREATED and settings.notify_wiki_created:
        should_notify = True
    elif notification_type == schemas.NotificationTypeEnum.WIKI_UPDATED and settings.notify_wiki_updated:
        should_notify = True
    elif notification_type == schemas.NotificationTypeEnum.WIKI_SHARED and settings.notify_wiki_shared:
        should_notify = True
    
    if not should_notify:
        return None
    
    # DB'ye bildirimi kaydet
    notification = models.Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        related_id=related_id,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Kullanıcı bilgilerini al
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return notification
    
    # E-posta bildirimi gönder
    if settings.email_notifications and user.email:
        if background_tasks:
            background_tasks.add_task(
                send_email_notification,
                user.email,
                title,
                message,
                notification_type,
                related_id
            )
    
    # Tarayıcı bildirimi gönder
    if settings.browser_notifications and user.browser_notification_token:
        if background_tasks:
            background_tasks.add_task(
                send_browser_notification,
                user.browser_notification_token,
                title,
                message,
                notification_type,
                related_id
            )
    
    return notification

def send_email_notification(
    recipient_email: str,
    title: str,
    message: str,
    notification_type: schemas.NotificationTypeEnum,
    related_id: int
):
    """E-posta bildirimi gönderir"""
    try:
        # E-posta bağlantısı kur
        link = ""
        if notification_type in [schemas.NotificationTypeEnum.TICKET_CREATED, 
                                schemas.NotificationTypeEnum.TICKET_UPDATED, 
                                schemas.NotificationTypeEnum.TICKET_ASSIGNED,
                                schemas.NotificationTypeEnum.TICKET_COMMENTED]:
            link = f"{APPLICATION_URL}/tickets/{related_id}"
        elif notification_type in [schemas.NotificationTypeEnum.WIKI_CREATED, 
                                  schemas.NotificationTypeEnum.WIKI_UPDATED, 
                                  schemas.NotificationTypeEnum.WIKI_SHARED]:
            link = f"{APPLICATION_URL}/wikis/{related_id}"
        
        # E-posta içeriği oluştur
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_FROM
        msg['To'] = recipient_email
        msg['Subject'] = f"Destek Sistemi: {title}"
        
        # Plain text versiyonu
        text_content = f"""{title}

{message}

{"Detayları görmek için lütfen sisteme giriş yapınız." if link else ""}

---
Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.
Destek Sistemi"""

        # HTML versiyonu
        html_content = f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .message {{ margin: 15px 0; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }}
        .button {{ display: inline-block; margin: 15px 0; padding: 10px 25px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #764ba2; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; font-size: 24px;">{title}</h2>
        </div>
        <div class="content">
            <div class="message">
                <p>{message}</p>
            </div>
            {f'<a href="{link}" class="button">Detayları Görüntüle</a>' if link else ''}
        </div>
        <div class="footer">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style="margin: 5px 0; color: #999;">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""
        
        # Her iki versiyonu ekle
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        # E-posta gönder
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            
    except Exception as e:
        print(f"E-posta gönderimi başarısız: {str(e)}")

def send_browser_notification(
    subscription_info: str,
    title: str,
    message: str,
    notification_type: str,
    related_id: int
):
    """Web Push bildirimi gönderir"""
    try:
        # Subscription bilgisini JSON'a çevir
        subscription_json = json.loads(subscription_info)
        
        # Bildirim verisini oluştur
        notification_data = {
            "notification": {
                "title": title,
                "body": message,
                "icon": "/logo192.png",
                "badge": "/logo192.png",
                "data": {
                    "url": get_notification_url(notification_type, related_id)
                }
            }
        }
        
        # Web Push bildirimini gönder
        webpush(
            subscription_info=subscription_json,
            data=json.dumps(notification_data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        
        return True
    except WebPushException as e:
        print(f"Web Push gönderme hatası: {e}")
        # 410 ve 404 hata kodları, aboneliğin artık geçerli olmadığını gösterir
        if e.response and (e.response.status_code == 410 or e.response.status_code == 404):
            # Abonelik geçersiz olduğunda kullanıcının push token'ını sıfırlayabilirsiniz
            return "SUBSCRIPTION_EXPIRED"
        return False
    except Exception as e:
        print(f"Web Push gönderme hatası (genel): {e}")
        return False

def get_notification_url(notification_type: str, related_id: int) -> str:
    """Bildirim türüne göre ilgili URL'yi döndürür"""
    if notification_type.startswith("TICKET_"):
        return f"{APPLICATION_URL}/tickets/{related_id}"
    elif notification_type.startswith("WIKI_"):
        return f"{APPLICATION_URL}/wikis/{related_id}"
    else:
        return APPLICATION_URL

async def notify_users_about_ticket(
    db: Session,
    background_tasks: BackgroundTasks,
    ticket_id: int,
    notification_type: schemas.NotificationTypeEnum,
    title: str,
    message: str,
    exclude_user_id: Optional[int] = None
):
    """
    Bir ticket ile ilgili tüm ilgili kullanıcılara bildirim gönderir
    (ticket sahibi, atanan kişi, departman üyeleri)
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        return
    
    # Bildirim gönderilecek kullanıcı ID'lerini topla
    user_ids = set()
    
    # Ticket yaratıcısı
    user_ids.add(ticket.creator_id)
    
    # Atanan kişi varsa
    if ticket.assignee_id:
        user_ids.add(ticket.assignee_id)
    
    # Departman üyeleri
    dept_users = db.query(models.UserDepartment).filter(
        models.UserDepartment.department_id == ticket.department_id
    ).all()
    
    for dept_user in dept_users:
        user_ids.add(dept_user.user_id)
    
    # Paylaşılan kullanıcılar
    shared_users = db.query(models.TicketUserShare).filter(
        models.TicketUserShare.ticket_id == ticket_id
    ).all()
    
    for shared_user in shared_users:
        user_ids.add(shared_user.user_id)
    
    # Paylaşılan departmanların üyeleri
    shared_depts = db.query(models.TicketDepartmentShare).filter(
        models.TicketDepartmentShare.ticket_id == ticket_id
    ).all()
    
    for shared_dept in shared_depts:
        dept_members = db.query(models.UserDepartment).filter(
            models.UserDepartment.department_id == shared_dept.department_id
        ).all()
        
        for member in dept_members:
            user_ids.add(member.user_id)
    
    # Hariç tutulan kullanıcıyı çıkar
    if exclude_user_id and exclude_user_id in user_ids:
        user_ids.remove(exclude_user_id)
    
    # Tüm kullanıcılara bildirim gönder
    for user_id in user_ids:
        await create_notification(
            db=db,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_id=ticket_id,
            background_tasks=background_tasks
        )

async def notify_users_about_wiki(
    db: Session,
    background_tasks: BackgroundTasks,
    wiki_id: int,
    notification_type: schemas.NotificationTypeEnum,
    title: str,
    message: str,
    exclude_user_id: Optional[int] = None
):
    """
    Bir wiki ile ilgili tüm ilgili kullanıcılara bildirim gönderir
    (wiki yaratıcısı, paylaşılan kullanıcılar, departman üyeleri)
    """
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    if not wiki:
        return
    
    # Bildirim gönderilecek kullanıcı ID'lerini topla
    user_ids = set()
    
    # Wiki yaratıcısı
    user_ids.add(wiki.creator_id)
    
    # Departmana ait ise departman üyeleri
    if wiki.department_id:
        dept_users = db.query(models.UserDepartment).filter(
            models.UserDepartment.department_id == wiki.department_id
        ).all()
        
        for dept_user in dept_users:
            user_ids.add(dept_user.user_id)
    
    # Paylaşılan kullanıcılar
    shared_users = db.query(models.WikiUserShare).filter(
        models.WikiUserShare.wiki_id == wiki_id
    ).all()
    
    for shared_user in shared_users:
        user_ids.add(shared_user.user_id)
    
    # Paylaşılan departmanların üyeleri
    shared_depts = db.query(models.WikiDepartmentShare).filter(
        models.WikiDepartmentShare.wiki_id == wiki_id
    ).all()
    
    for shared_dept in shared_depts:
        dept_members = db.query(models.UserDepartment).filter(
            models.UserDepartment.department_id == shared_dept.department_id
        ).all()
        
        for member in dept_members:
            user_ids.add(member.user_id)
    
    # Hariç tutulan kullanıcıyı çıkar
    if exclude_user_id and exclude_user_id in user_ids:
        user_ids.remove(exclude_user_id)
    
    # Tüm kullanıcılara bildirim gönder
    for user_id in user_ids:
        await create_notification(
            db=db,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_id=wiki_id,
            background_tasks=background_tasks
        )