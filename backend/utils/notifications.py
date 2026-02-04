from fastapi import BackgroundTasks, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
import schemas
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import requests
import json
from typing import List, Optional, Dict, Any
from database import get_db, SessionLocal
from pywebpush import webpush, WebPushException
import base64
import pytz

# E-posta ayarları
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.example.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "user@example.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "password")
EMAIL_FROM = os.getenv("EMAIL_FROM", "destek@example.com")
APPLICATION_URL = os.getenv("APP_URL") or os.getenv("APPLICATION_URL", "http://localhost:3000")

# VAPID anahtarları - Bunları uygulamanızın .env dosyasında saklamalısınız
# Bu anahtarlar örnek amaçlıdır, kendi uygulamanız için yeni anahtarlar oluşturmalısınız
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "MIGEAgEAMBAGByqGSM49AgEGBSuBBAAKBG0wawIBAQQgC0PIMt63L9QWRIi_r4PTYYmwqvXBKV9MtCTJPyLE0uOhRANCAATBFnKFCH4UrQzWng09FoHlMC5K0lolA1iiQh8BkMhU8qgYP8NyKKVg0m0NgCW-cO1auL0HEpQrUwX2VGiuYGE2")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "BLBz4TKkKHRLdLJ36UNT7_eLJHLEBB1CPxNn3R1MytaR9jdJvEcTNWHo7qV_sIHYdBK7-xF4Wp9c7yJKPsOI9LA")
VAPID_CLAIMS = {
    "sub": f"mailto:{EMAIL_FROM}"
}

from utils import mail_templates

import logging
from sqlalchemy import text

# Logger ayarları
logger = logging.getLogger("uvicorn.error")

async def create_notification(
    db: Session,
    user_id: int,
    notification_type: schemas.NotificationTypeEnum,
    title: str,
    message: str,
    related_id: int,
    background_tasks: Optional[BackgroundTasks] = None,
    custom_email_body: Optional[str] = None,
    custom_email_html: Optional[str] = None
):
    """
    Yeni bildirim oluşturur ve kullanıcının tercihlerine göre gönderir.
    """
    try:
        # Kullanıcının bildirim ayarlarını kontrol et
        settings = db.query(models.NotificationSettings).filter(
            models.NotificationSettings.user_id == user_id
        ).first()
        
        if not settings:
            settings = models.NotificationSettings(user_id=user_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        

        # Bildirim türüne göre tercihleri kontrol et
        should_send_email = settings.email_notifications
        should_send_push = settings.browser_notifications

        type_enabled = True
        if notification_type == schemas.NotificationTypeEnum.TICKET_CREATED and not settings.ticket_created:
            type_enabled = False
        elif notification_type == schemas.NotificationTypeEnum.TICKET_UPDATED and not settings.ticket_updated:
            type_enabled = False
        elif notification_type == schemas.NotificationTypeEnum.TICKET_ASSIGNED and not settings.ticket_assigned:
            type_enabled = False
        elif notification_type == schemas.NotificationTypeEnum.TICKET_COMMENTED and not settings.ticket_commented:
            type_enabled = False

        if not type_enabled:
            should_send_email = False
            should_send_push = False

        # Daha önce aynı kullanıcı, tip ve ilgili id için mail gönderilmiş mi kontrol et
        # Ayrıca son 5 dakika içinde aynı bildirim gönderilmişse tekrar gönderme (loop önleme)
        five_minutes_ago = datetime.now(pytz.timezone('Europe/Istanbul')).replace(tzinfo=None) - timedelta(minutes=5)
        existing_mail = db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.type == notification_type,
            models.Notification.related_id == related_id,
            models.Notification.email_sent == True,
            models.Notification.created_at > five_minutes_ago
        ).first()
        if existing_mail:
            should_send_email = False
            should_send_push = False  # Push bildirimi de engelle

        # DB'ye bildirimi kaydet - İstanbul timezone kullan
        istanbul_tz = pytz.timezone('Europe/Istanbul')
        now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
        
        notification = models.Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            related_id=related_id,
            is_read=False,
            created_at=now_istanbul
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Kullanıcı bilgilerini al
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user or not user.email:
            should_send_email = False

        # E-posta bildirimi gönder (Background Task'e ekle)
        if should_send_email:
            if background_tasks:
                # ÖNEMLİ: Background task içinde request-scoped DB kullanılmaz. 
                # send_email_notification kendi session'ını oluşturacak.
                background_tasks.add_task(
                    send_email_notification,
                    None, # db parametresi None geçiliyor
                    user.email,
                    title,
                    message,
                    notification_type,
                    related_id,
                    custom_email_body,
                    custom_email_html
                )
                # email_sent True olarak güncelle
                notification.email_sent = True
                db.commit()
            else:
                # Arka plan görevi yoksa senkron gönder (çok tavsiye edilmez ama fallback)
                send_email_notification(db, user.email, title, message, notification_type, related_id, custom_email_body, custom_email_html)
                notification.email_sent = True
                db.commit()

        # Tarayıcı bildirimi gönder
        if should_send_push and user.browser_notification_token:
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

    except Exception as e:
        logger.error(f"Bildirim oluşturulurken hata: {str(e)}")
        if db: db.rollback()
        return None

def send_email_notification(
    db: Optional[Session],
    recipient_email: str,
    title: str,
    message: str,
    notification_type: schemas.NotificationTypeEnum,
    related_id: int,
    custom_body: Optional[str] = None,
    custom_html: Optional[str] = None
):
    """E-posta bildirimi gönderir (Background Task olarak çalışabilir)"""
    standalone_session = False
    if not db:
        db = SessionLocal()
        standalone_session = True

    try:
        logger.info(f"E-posta gönderimi başlatılıyor: {recipient_email} - Konu: {title}")
        
        # DB'den e-posta yapılandırmasını al
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("E-posta yapılandırması bulunamadı, gönderim iptal edildi.")
            return

        if not email_config.smtp_server or not email_config.from_email:
            logger.warning("E-posta yapılandırması eksik (Sunucu veya Gönderen adresi yok).")
            return

        msg = MIMEMultipart('alternative')
        msg['From'] = f"{email_config.from_name} <{email_config.from_email}>"
        msg['To'] = recipient_email
        msg['Subject'] = f"Destek Sistemi: {title}"
        
        # İçerik belirle
        if custom_body and custom_html:
            text_content = custom_body
            html_content = custom_html
        else:
            text_content = f"{title}\n\n{message}"
            html_content = f"<h3>{title}</h3><p>{message}</p>"
        
        msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # SMTP Sunucusuna Bağlan
        try:
            port = email_config.smtp_port or 587
            use_ssl = (port == 465)
            
            logger.info(f"SMTP Bağlanıyor: {email_config.smtp_server}:{port} (SSL: {use_ssl})")
            
            if use_ssl:
                server = smtplib.SMTP_SSL(email_config.smtp_server, port, timeout=10)
            else:
                server = smtplib.SMTP(email_config.smtp_server, port, timeout=10)

            # Ehlo / StartTLS
            if not use_ssl and getattr(email_config, 'smtp_use_tls', True):
                server.starttls()
            
            # Login
            if email_config.smtp_username and email_config.smtp_password:
                server.login(email_config.smtp_username, email_config.smtp_password)
            
            # Send
            server.send_message(msg)
            server.quit()
            logger.info(f"E-posta başarıyla gönderildi: {recipient_email}")
            
        except smtplib.SMTPException as smtp_err:
            logger.error(f"SMTP Hatası ({recipient_email}): {str(smtp_err)}")
        except Exception as conn_err:
            logger.error(f"E-posta bağlantı hatası ({recipient_email}): {str(conn_err)}")
            
    except Exception as e:
        logger.error(f"E-posta gönderiminde genel hata: {str(e)}")
    finally:
        if standalone_session:
            db.close()

def send_browser_notification(
    subscription_info: str,
    title: str,
    message: str,
    notification_type: str,
    related_id: int
):
    """Web Push bildirimi gönderir"""
    try:
        subscription_json = json.loads(subscription_info)
        notification_data = {
            "notification": {
                "title": title,
                "body": message,
                "icon": "/logo192.png",
                "badge": "/logo192.png",
                "data": {
                    "url": f"{APPLICATION_URL}/tickets/{related_id}" if notification_type.startswith("TICKET_") else APPLICATION_URL
                }
            }
        }
        webpush(
            subscription_info=subscription_json,
            data=json.dumps(notification_data),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        return True
    except Exception as e:
        logger.error(f"Web Push gönderme hatası: {str(e)}")
        return False

async def notify_users_about_ticket(
    db: Optional[Session],
    background_tasks: Optional[BackgroundTasks],
    ticket_id: int,
    notification_type: schemas.NotificationTypeEnum,
    title: str,
    message: str,
    exclude_user_id: Optional[int] = None,
    context: Optional[str] = None,
    comment_id: Optional[int] = None,
    attachment_id: Optional[int] = None
):
    """
    Bir ticket ile ilgili kullanıcılara bildirim gönderir.
    """
    standalone_session = False
    if not db:
        db = SessionLocal()
        standalone_session = True

    try:
        ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
        if not ticket: return
        
        app_url = os.getenv("APP_URL") or os.getenv("APPLICATION_URL", "http://localhost:3000")
        config = db.query(models.GeneralConfig).first()
        is_triage_enabled = config.workflow_enabled if config else False
        triage_user_id = config.triage_user_id if config else None
        triage_enabled_at = getattr(config, 'triage_enabled_at', None)
        triage_disabled_at = getattr(config, 'triage_disabled_at', None)

        recipients = set()
        if ticket.creator_id: recipients.add((ticket.creator_id, 'user'))
        if ticket.assignee_id:
            role = 'staff'
            if is_triage_enabled and triage_user_id and ticket.assignee_id == triage_user_id: 
                role = 'triage'
            recipients.add((ticket.assignee_id, role))
        elif ticket.department_id:
             # Talep bir birime atanmış ama kişiye atanmamış - departman personeline gönder
             dept_users = db.query(models.User).filter(
                 models.User.department_id == ticket.department_id,
                 models.User.is_active == True
             ).all()
             for d_user in dept_users: 
                 # Triaj departmanı ise 'triage' rolü ver, yoksa 'staff'
                 role = 'staff'
                 if is_triage_enabled and config and config.triage_department_id and ticket.department_id == config.triage_department_id:
                     role = 'triage'
                 recipients.add((d_user.id, role))

        for user_id, role in recipients:
            if user_id == exclude_user_id:
                continue

            c_text, c_html = None, None
            c_title, c_msg = title, message

            if context == 'creation':
                # Triaj maili sadece triaj aktif edildikten sonra açılan talepler için gönderilsin
                if role == 'triage':
                    # Eğer triage_enabled_at varsa ve ticket o zamandan önce oluşturulduysa, mail gönderme
                    if triage_enabled_at and ticket.created_at:
                        if ticket.created_at < triage_enabled_at:
                            continue  # Triaj aktif edilmeden önce açılan taleplere triaj maili gönderme
                        # Eğer triaj devre dışı bırakıldıysa ve ticket o zamandan sonra açıldıysa, mail gönderme
                        if triage_disabled_at and ticket.created_at >= triage_disabled_at:
                            continue
                    # Triaj enabled ama timestamp yoksa veya kontroller geçtiyse mail gönder
                    c_text, c_html = mail_templates.get_ticket_created_triage_template(ticket, app_url)
                    c_title, c_msg = "Yönlendirme Bekleyen Talep", "Sisteme yeni bir talep düştü."
                elif role == 'user':
                    c_text, c_html = mail_templates.get_ticket_created_user_template(ticket, app_url)
                    c_title, c_msg = "Talebiniz Alındı", "Talebiniz başarıyla oluşturuldu."
                elif role == 'staff':
                    # Staff için assignee olmalı - yoksa triage template kullan
                    if ticket.assignee:
                        c_text, c_html = mail_templates.get_ticket_created_staff_template(ticket, app_url)
                        c_title, c_msg = "Size Atanan Yeni Talep", "Size yeni bir talep atandı."
                    else:
                        # Departman ataması - triage gibi davran
                        c_text, c_html = mail_templates.get_ticket_created_triage_template(ticket, app_url)
                        c_title, c_msg = "Biriminize Yeni Talep", "Biriminize yeni bir talep düştü."
            
            elif context == 'comment' and comment_id:
                comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
                recipient_user = db.query(models.User).filter(models.User.id == user_id).first()
                commenter = db.query(models.User).filter(models.User.id == exclude_user_id).first()
                if comment and recipient_user and commenter:
                    c_text, c_html = mail_templates.get_comment_notification_template(ticket, commenter, recipient_user, comment, app_url)
                    c_title, c_msg = "Yeni Yorum Eklendi", f"{commenter.full_name} yorum yazdı."

            elif context == 'update':
                updater = db.query(models.User).filter(models.User.id == exclude_user_id).first()
                recipient_user = db.query(models.User).filter(models.User.id == user_id).first()
                if updater and recipient_user:
                    c_text, c_html = mail_templates.get_ticket_updated_template(ticket, updater, recipient_user, app_url, message)
                    c_title, c_msg = "Talep Güncellendi", f"{updater.full_name} güncelledi."

            elif context == 'attachment' and attachment_id:
                attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
                uploader = db.query(models.User).filter(models.User.id == exclude_user_id).first()
                recipient_user = db.query(models.User).filter(models.User.id == user_id).first()
                if attachment and uploader and recipient_user:
                    c_text, c_html = mail_templates.get_attachment_notification_template(ticket, uploader, recipient_user, attachment, app_url)
                    c_title, c_msg = "Dosya Eklendi", f"{uploader.full_name} dosya ekledi."

            await create_notification(
                db=db, user_id=user_id, notification_type=notification_type,
                title=c_title, message=c_msg, related_id=ticket_id,
                background_tasks=background_tasks, custom_email_body=c_text, custom_email_html=c_html
            )

    finally:
        if standalone_session:
            db.close()

async def notify_users_about_wiki(
    db: Optional[Session],
    background_tasks: BackgroundTasks,
    wiki_id: int,
    notification_type: schemas.NotificationTypeEnum,
    title: str,
    message: str,
    exclude_user_id: Optional[int] = None
):
    """Bir wiki ile ilgili kullanıcılara bildirim gönderir"""
    standalone_session = False
    if not db:
        db = SessionLocal()
        standalone_session = True
    try:
        wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
        if not wiki: return
        user_ids = {wiki.creator_id}
        if wiki.department_id:
            dept = db.query(models.Department).filter(models.Department.id == wiki.department_id).first()
            if dept:
                for u in dept.users: user_ids.add(u.id)
                for u in dept.primary_users: user_ids.add(u.id)
        for u in wiki.shared_users: user_ids.add(u.id)
        for d in wiki.shared_departments:
            for u in d.users: user_ids.add(u.id)
            for u in d.primary_users: user_ids.add(u.id)
        if exclude_user_id in user_ids: user_ids.remove(exclude_user_id)
        for u_id in user_ids:
            await create_notification(db=db, user_id=u_id, notification_type=notification_type, title=title, message=message, related_id=wiki_id, background_tasks=background_tasks)
    finally:
        if standalone_session: db.close()