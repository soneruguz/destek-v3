from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
import shutil
import os
from pathlib import Path
from sqlalchemy.orm import Session
from typing import List, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

import models
import schemas
from database import get_db
from auth import get_current_active_user

logger = logging.getLogger(__name__)

# Base URL için konfigürasyon (Environment variable'dan al, yoksa varsayılanı kullan)
import os
BASE_URL = os.getenv("APP_URL", "https://destek.tesmer.org.tr")

# Helper functions for translations
def translate_status(status: str) -> str:
    """Durum durumunu Türkçeye çevir"""
    status_map = {
        'open': 'Açık',
        'closed': 'Kapalı',
        'in_progress': 'İşlemde',
        'pending': 'Beklemede',
        'resolved': 'Çözüldü',
        'on_hold': 'Beklemeye Alındı'
    }
    return status_map.get(status, status)

def translate_priority(priority: str) -> str:
    """Önceliği Türkçeye çevir"""
    priority_map = {
        'low': 'Düşük',
        'medium': 'Orta',
        'high': 'Yüksek',
        'critical': 'Kritik'
    }
    return priority_map.get(priority, priority) if priority else 'Belirtilmemiş'


def send_ticket_created_email(db: Session, ticket: models.Ticket, recipient: models.User):
    """Talep oluşturulduğunda bilgilendirme e-postası gönder"""
    from datetime import datetime
    try:
        # Kullanıcının bildirim ayarlarını kontrol et
        notif_settings = db.query(models.NotificationSettings).filter(
            models.NotificationSettings.user_id == recipient.id
        ).first()
        
        # Eğer kullanıcı mail bildirimlerini kapatmışsa logla ve gönderme
        if notif_settings and not notif_settings.email_notifications:
            logger.info(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                f"Mail GÖNDERİLMEDİ - Kullanıcı: {recipient.full_name} ({recipient.email}), "
                f"Talep ID: {ticket.id}, Sebep: Kullanıcı e-posta bildirimlerini devre dışı bırakmış"
            )
            return
        
        # Eğer ticket_assigned bildirimi kapalıysa
        if notif_settings and notif_settings.email_notifications and not notif_settings.ticket_assigned:
            logger.info(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                f"Mail GÖNDERİLMEDİ - Kullanıcı: {recipient.full_name} ({recipient.email}), "
                f"Talep ID: {ticket.id}, Sebep: Kullanıcı 'talep atama' bildirimlerini kapatmış"
            )
            return
        
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("Email configuration not found, skipping created notification")
            return
        if not recipient.email:
            logger.warning(f"Recipient {recipient.username} has no email, skipping created notification")
            return

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Destek Sistemi: {ticket.title} - Talep Oluşturuldu"
        msg['From'] = email_config.from_email
        msg['To'] = recipient.email

        dept_name = ticket.department.name if ticket.department else 'Genel'
        creator_name = ticket.creator.full_name if ticket.creator else 'Bilinmiyor'
        priority_tr = translate_priority(ticket.priority or 'medium')
        status_tr = translate_status(ticket.status)

        text = f"""Destek Talebiniz Oluşturuldu

Merhaba {recipient.full_name},

"{ticket.title}" başlıklı talep oluşturuldu.

Talep Detayları:
- Başlık: {ticket.title}
- Oluşturan: {creator_name}
- Departman: {dept_name}
- Öncelik: {priority_tr}
- Durum: {status_tr}

Talebi görüntülemek için sisteme giriş yapabilirsiniz.

Destek Sistemi"""

        html = f"""<!DOCTYPE html>
<html lang=\"tr\">
<head>
    <meta charset=\"UTF-8\">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .details {{ background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; border-radius: 4px; }}
        .details p {{ margin: 8px 0; }}
        .label {{ font-weight: bold; color: #2563eb; }}
        .button {{ display: inline-block; margin: 20px 0; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #1d4ed8; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }}
    </style>
</head>
<body>
    <div class=\"container\">
        <div class=\"header\">
            <h2>🆕 Yeni Destek Talebi</h2>
        </div>
        <div class=\"content\">
            <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
            <p><strong>"{ticket.title}"</strong> başlıklı bir talep oluşturuldu.</p>
            <div class=\"details\">
                <p><span class=\"label\">📋 Başlık:</span> {ticket.title}</p>
                <p><span class=\"label\">👤 Oluşturan:</span> {creator_name}</p>
                <p><span class=\"label\">🏢 Departman:</span> {dept_name}</p>
                <p><span class=\"label\">⚠️ Öncelik:</span> {priority_tr}</p>
                <p><span class=\"label\">🔔 Durum:</span> {status_tr}</p>
            </div>
            <p style=\"text-align: center;\">
                <a href=\"{BASE_URL}/tickets/{ticket.id}\" class=\"button\">Talebi Görüntüle</a>
            </p>
        </div>
        <div class=\"footer\">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style=\"margin: 5px 0;\">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""

        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)

        if email_config.smtp_username and email_config.smtp_password:
            server.login(email_config.smtp_username, email_config.smtp_password)

        server.sendmail(email_config.from_email, recipient.email, msg.as_string())
        
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")

        from datetime import datetime
        logger.info(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"Mail GÖNDERİLDİ - Kullanıcı: {recipient.full_name} ({recipient.email}), "
            f"Talep ID: {ticket.id}, Konu: Talep Oluşturuldu"
        )
    except Exception as e:
        logger.error(f"Failed to send created email: {str(e)}", exc_info=True)

# Helper function to send ticket assignment email
def send_ticket_assignment_email(db: Session, ticket: models.Ticket, assignee: models.User):
    """Ticket atandığında e-posta gönder"""
    from datetime import datetime
    try:
        # Kullanıcının bildirim ayarlarını kontrol et
        notif_settings = db.query(models.NotificationSettings).filter(
            models.NotificationSettings.user_id == assignee.id
        ).first()
        
        # Eğer kullanıcı mail bildirimlerini kapatmışsa logla ve gönderme
        if notif_settings and not notif_settings.email_notifications:
            logger.info(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                f"Mail GÖNDERİLMEDİ - Kullanıcı: {assignee.full_name} ({assignee.email}), "
                f"Talep ID: {ticket.id}, Sebep: Kullanıcı e-posta bildirimlerini devre dışı bırakmış"
            )
            return
        
        # Eğer ticket_assigned bildirimi kapalıysa
        if notif_settings and notif_settings.email_notifications and not notif_settings.ticket_assigned:
            logger.info(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                f"Mail GÖNDERİLMEDİ - Kullanıcı: {assignee.full_name} ({assignee.email}), "
                f"Talep ID: {ticket.id}, Sebep: Kullanıcı 'talep atama' bildirimlerini kapatmış"
            )
            return
        
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("Email configuration not found, skipping assignment notification")
            return
        
        if not assignee.email:
            logger.warning(f"Assignee {assignee.username} has no email, skipping notification")
            return
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Destek Sistemi: {ticket.title} - Atandı"
        msg['From'] = email_config.from_email
        msg['To'] = assignee.email
        
        # Plain text versiyonu
        text = f"""Destek Talebine Atandınız

Merhaba {assignee.full_name},

Size "{ticket.title}" başlıklı bir destek talebine atanmışsınız.

Talep Detayları:
- Başlık: {ticket.title}
- Oluşturan: {ticket.creator.full_name if ticket.creator else 'Bilinmiyor'}
- Departman: {ticket.department.name if ticket.department else 'Genel'}
- Öncelik: {translate_priority(ticket.priority or 'medium')}
- Durum: {translate_status(ticket.status)}

Lütfen talebi kontrol etmek için sisteme giriş yapınız.

Destek Sistemi"""
        
        # HTML versiyonu
        html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .details {{ background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; border-radius: 4px; }}
        .details p {{ margin: 8px 0; }}
        .label {{ font-weight: bold; color: #667eea; }}
        .button {{ display: inline-block; margin: 20px 0; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #764ba2; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📌 Destek Talebine Atandınız</h2>
        </div>
        <div class="content">
            <p>Merhaba <strong>{assignee.full_name}</strong>,</p>
            <p>Size <strong>"{ticket.title}"</strong> başlıklı bir destek talebine atanmışsınız.</p>
            
            <div class="details">
                <p><span class="label">📋 Başlık:</span> {ticket.title}</p>
                <p><span class="label">👤 Oluşturan:</span> {ticket.creator.full_name if ticket.creator else 'Bilinmiyor'}</p>
                <p><span class="label">🏢 Departman:</span> {ticket.department.name if ticket.department else 'Genel'}</p>
                <p><span class="label">⚠️ Öncelik:</span> {translate_priority(ticket.priority or 'medium')}</p>
                <p><span class="label">🔔 Durum:</span> {translate_status(ticket.status)}</p>
            </div>
            
            <p style="text-align: center;">
                <a href="{BASE_URL}/tickets/{ticket.id}" class="button">Talebi Görüntüle</a>
            </p>
        </div>
        <div class="footer">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style="margin: 5px 0;">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""
        
        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
        
        server.sendmail(email_config.from_email, assignee.email, msg.as_string())
        
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")
        
        logger.info(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"Mail GÖNDERİLDİ - Kullanıcı: {assignee.full_name} ({assignee.email}), "
            f"Talep ID: {ticket.id}, Konu: Talep Atandı"
        )
    except Exception as e:
        logger.error(f"Failed to send assignment email: {str(e)}", exc_info=True)

def send_ticket_created_to_department_email(db: Session, ticket: models.Ticket, recipient: models.User):
    """Birime açılan taleplerde tüm birim personeline gönderilecek mail"""
    from datetime import datetime
    try:
        # Kullanıcının bildirim ayarlarını kontrol et
        notif_settings = db.query(models.NotificationSettings).filter(
            models.NotificationSettings.user_id == recipient.id
        ).first()
        
        # Eğer kullanıcı mail bildirimlerini kapatmışsa logla ve gönderme
        if notif_settings and not notif_settings.email_notifications:
            logger.info(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                f"Mail GÖNDERİLMEDİ - Kullanıcı: {recipient.full_name} ({recipient.email}), "
                f"Talep ID: {ticket.id}, Sebep: Kullanıcı e-posta bildirimlerini devre dışı bırakmış"
            )
            return
        
        # Eğer ticket_assigned bildirimi kapalıysa
        if notif_settings and notif_settings.email_notifications and not notif_settings.ticket_assigned:
            logger.info(
                f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                f"Mail GÖNDERİLMEDİ - Kullanıcı: {recipient.full_name} ({recipient.email}), "
                f"Talep ID: {ticket.id}, Sebep: Kullanıcı 'talep atama' bildirimlerini kapatmış"
            )
            return
        
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("Email configuration not found, skipping department notification")
            return
        if not recipient.email:
            logger.warning(f"Recipient {recipient.username} has no email, skipping department notification")
            return

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Destek Sistemi: {ticket.title} - Biriminize Talep Açıldı"
        msg['From'] = email_config.from_email
        msg['To'] = recipient.email

        dept_name = ticket.department.name if ticket.department else 'Genel'
        creator_name = ticket.creator.full_name if ticket.creator else 'Bilinmiyor'
        priority_tr = translate_priority(ticket.priority or 'medium')
        status_tr = translate_status(ticket.status)

        text = f"""Biriminize Destek Talebi Açıldı

Merhaba {recipient.full_name},

Biriminiz "{ticket.title}" başlıklı bir destek talebine sahip.

Talep Detayları:
- Başlık: {ticket.title}
- Oluşturan: {creator_name}
- Departman: {dept_name}
- Öncelik: {priority_tr}
- Durum: {status_tr}

Talebi görüntülemek ve işlemek için sisteme giriş yapabilirsiniz.

Destek Sistemi"""

        html = f"""<!DOCTYPE html>
<html lang=\"tr\">
<head>
    <meta charset=\"UTF-8\">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .details {{ background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; border-radius: 4px; }}
        .details p {{ margin: 8px 0; }}
        .label {{ font-weight: bold; color: #10b981; }}
        .button {{ display: inline-block; margin: 20px 0; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #059669; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }}
    </style>
</head>
<body>
    <div class=\"container\">
        <div class=\"header\">
            <h2>📢 Biriminize Talep Açıldı</h2>
        </div>
        <div class=\"content\">
            <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
            <p>Biriminiz <strong>"{ticket.title}"</strong> başlıklı bir destek talebine sahip.</p>
            <div class=\"details\">
                <p><span class=\"label\">📋 Başlık:</span> {ticket.title}</p>
                <p><span class=\"label\">👤 Oluşturan:</span> {creator_name}</p>
                <p><span class=\"label\">🏢 Departman:</span> {dept_name}</p>
                <p><span class=\"label\">⚠️ Öncelik:</span> {priority_tr}</p>
                <p><span class=\"label\">🔔 Durum:</span> {status_tr}</p>
            </div>
            <p style=\"text-align: center;\">
                <a href=\"{BASE_URL}/tickets/{ticket.id}\" class=\"button\">Talebi Görüntüle ve İşle</a>
            </p>
        </div>
        <div class=\"footer\">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style=\"margin: 5px 0;\">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""

        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)

        if email_config.smtp_username and email_config.smtp_password:
            server.login(email_config.smtp_username, email_config.smtp_password)

        server.sendmail(email_config.from_email, recipient.email, msg.as_string())
        
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")

        logger.info(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"Mail GÖNDERİLDİ - Kullanıcı: {recipient.full_name} ({recipient.email}), "
            f"Talep ID: {ticket.id}, Konu: Birime Talep Açıldı"
        )
    except Exception as e:
        logger.error(f"Failed to send department email: {str(e)}", exc_info=True)

def send_comment_notification_email(db: Session, ticket: models.Ticket, commenter: models.User, recipient: models.User, comment: models.Comment):
    """Send email when someone adds a comment to a ticket"""
    try:
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("Email configuration not found, skipping comment notification")
            return
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Destek Sistemi: {ticket.title} - Yorum Eklendi"
        msg['From'] = email_config.from_email
        msg['To'] = recipient.email or ""
        
        # Plain text versiyonu
        text = f"""Destek Talebinize Yorum Eklendi

Merhaba {recipient.full_name},

{commenter.full_name} ({commenter.username}) destek talebinize bir yorum ekledi:

Talep: {ticket.title}
Yorum: {comment.content}

Detayları görmek için sisteme giriş yapınız.

Destek Sistemi"""
        
        # HTML versiyonu
        html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .comment-box {{ background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; border-radius: 4px; }}
        .comment-author {{ font-weight: bold; color: #10b981; font-size: 14px; margin-bottom: 8px; }}
        .comment-text {{ color: #333; font-style: italic; }}
        .button {{ display: inline-block; margin: 20px 0; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #059669; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>💬 Yorum Eklendi</h2>
        </div>
        <div class="content">
            <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
            <p><strong>{commenter.full_name}</strong> destek talebinize yorum ekledi.</p>
            
            <div class="comment-box">
                <p><span class="comment-author">📌 Talep: {ticket.title}</span></p>
                <p class="comment-text">💭 {comment.content}</p>
            </div>
            
            <p style="text-align: center;">
                <a href="{BASE_URL}/tickets/{ticket.id}" class="button">Görüşmeleri Gör</a>
            </p>
        </div>
        <div class="footer">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style="margin: 5px 0;">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""
        
        # Attach both versions
        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        # Connect to SMTP server
        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
        
        # Authenticate if needed
        if email_config.smtp_username and email_config.smtp_password:
            server.login(email_config.smtp_username, email_config.smtp_password)
        
        # Send email
        server.sendmail(email_config.from_email, recipient.email, msg.as_string())
        
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")
        
        logger.info(f"Comment notification email sent to {recipient.email} for ticket {ticket.id}")
    except Exception as e:
        logger.error(f"Failed to send comment notification email: {str(e)}", exc_info=True)


def send_ticket_updated_email(db: Session, ticket: models.Ticket, updater: models.User, recipient: models.User):
    """Send email when a ticket is updated"""
    try:
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("Email configuration not found, skipping ticket update notification")
            return
        if not recipient.email:
            logger.warning(f"Recipient {recipient.username} has no email, skipping ticket update notification")
            return

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Destek Sistemi: {ticket.title} - Güncellendi"
        msg['From'] = email_config.from_email
        msg['To'] = recipient.email

        text = f"""
    Merhaba {recipient.full_name},

    {updater.full_name} talebi {translate_status(ticket.status)} durumuna aldı.

    Talep: {ticket.title}
    Durum: {translate_status(ticket.status)}
    Öncelik: {translate_priority(ticket.priority)}
    Atanan: {(ticket.assignee.full_name if ticket.assignee else 'Atama yok')}

    Detayları görmek için sisteme giriş yapınız.

    Destek Sistemi
    """

        html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .update-box {{ background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; border-radius: 4px; }}
        .update-item {{ margin: 8px 0; padding: 8px; }}
        .label {{ font-weight: bold; color: #2563eb; }}
        .button {{ display: inline-block; margin: 20px 0; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #1e40af; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔄 Destek Talebi Güncellendi</h2>
        </div>
        <div class="content">
            <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
            <p><strong>{updater.full_name}</strong> talebi <strong>{translate_status(ticket.status)}</strong> durumuna aldı.</p>
            <div class="update-box">
                <div class="update-item">
                    <span class="label">📋 Talep:</span> {ticket.title}
                </div>
                <div class="update-item">
                    <span class="label">🔔 Durum:</span> {translate_status(ticket.status)}
                </div>
                <div class="update-item">
                    <span class="label">⚠️ Öncelik:</span> {translate_priority(ticket.priority)}
                </div>
                <div class="update-item">
                    <span class="label">👤 Atanan:</span> {(ticket.assignee.full_name if ticket.assignee else 'Atama yok')}
                </div>
            </div>
            <p style="text-align: center;">
                <a href="{BASE_URL}/tickets/{ticket.id}" class="button">Detayları Görüntüle</a>
            </p>
        </div>
        <div class="footer">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style="margin: 5px 0;">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)

        if email_config.smtp_username and email_config.smtp_password:
            server.login(email_config.smtp_username, email_config.smtp_password)

        server.sendmail(email_config.from_email, recipient.email, msg.as_string())
        
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")

        logger.info(f"Ticket updated email sent to {recipient.email} for ticket {ticket.id}")
    except Exception as e:
        logger.error(f"Failed to send ticket updated email: {str(e)}", exc_info=True)


def send_attachment_notification_email(db: Session, ticket: models.Ticket, attachment: models.Attachment, uploader: models.User, recipient: models.User):
    """Dosya eklendiğinde e-posta gönder"""
    try:
        email_config = db.query(models.EmailConfig).first()
        if not email_config:
            logger.warning("Email configuration not found, skipping attachment notification")
            return
        if not recipient.email:
            logger.warning(f"Recipient {recipient.username} has no email, skipping attachment notification")
            return
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Destek Sistemi: {ticket.title} - Dosya Eklendi"
        msg['From'] = email_config.from_email
        msg['To'] = recipient.email

        text = f"""Destek Talebine Dosya Eklendi

Merhaba {recipient.full_name},

{uploader.full_name} ({uploader.username}) destek talebine bir dosya ekledi:

Talep: {ticket.title}
Dosya: {attachment.filename}

Detayları görmek için sisteme giriş yapınız.

Destek Sistemi"""

        html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .content {{ background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }}
        .file-box {{ background: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; border-radius: 4px; }}
        .file-info {{ margin: 8px 0; }}
        .label {{ font-weight: bold; color: #f59e0b; }}
        .filename {{ background: #fffbeb; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }}
        .button {{ display: inline-block; margin: 20px 0; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; }}
        .button:hover {{ background: #d97706; }}
        .footer {{ margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📎 Dosya Eklendi</h2>
        </div>
        <div class="content">
            <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
            
            <div class="file-box">
                <div class="file-info">
                    <span class="label">📌 Talep:</span> {ticket.title}
                </div>
                <div class="file-info" style="margin-top: 15px;">
                    <span class="label">📄 Dosya Adı:</span><br/>
                    <span class="filename">{attachment.filename}</span>
                </div>
            </div>
            
            <p style="text-align: center;">
                <a href="{BASE_URL}/tickets/{ticket.id}" class="button">Detayları Görüntüle</a>
            </p>
        </div>
        <div class="footer">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style="margin: 5px 0;">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""
        
        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)

        if email_config.smtp_username and email_config.smtp_password:
            server.login(email_config.smtp_username, email_config.smtp_password)

        server.sendmail(email_config.from_email, recipient.email, msg.as_string())
        
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")

        logger.info(f"Attachment notification email sent to {recipient.email} for ticket {ticket.id}")
    except Exception as e:
        logger.error(f"Failed to send attachment notification email: {str(e)}", exc_info=True)

router = APIRouter(
    tags=["system-settings"],
    dependencies=[Depends(get_current_active_user)]
)

# Email Configuration Endpoints
@router.post("/email-config", response_model=schemas.EmailConfigResponse)
def create_email_config(
    config: schemas.EmailConfigCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new email configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    # Check if config already exists
    existing_config = db.query(models.EmailConfig).first()
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email configuration already exists. Use PUT to update."
        )
    
    new_config = models.EmailConfig(**config.dict())
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config

@router.get("/email-config", response_model=schemas.EmailConfigResponse)
def get_email_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get the email configuration"""
    config = db.query(models.EmailConfig).first()
    if not config:
        return models.EmailConfig()
    return config

@router.post("/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Upload a custom system logo"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Create branding directory if not exists
    upload_dir = os.environ.get("UPLOAD_DIR", "/app/uploads")
    branding_dir = os.path.join(upload_dir, "branding")
    os.makedirs(branding_dir, exist_ok=True)
    
    # Generate filename (keep extension)
    ext = os.path.splitext(file.filename)[1]
    filename = f"custom_logo{ext}"
    file_path = os.path.join(branding_dir, filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Update config in DB
        config = db.query(models.GeneralConfig).first()
        if not config:
            config = models.GeneralConfig()
            db.add(config)
        
        # URL relative to /uploads
        # Note: Frontend will prepend the API/Uploads base URL
        # We store: /branding/custom_logo.png
        relative_path = f"/branding/{filename}"
        config.custom_logo_url = relative_path
        db.commit()
        
        return {"url": relative_path}
        
    except Exception as e:
        logger.error(f"Logo upload failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save logo file"
        )
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view system settings"
        )
    
    config = db.query(models.EmailConfig).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email configuration not found"
        )
    return config

@router.put("/email-config", response_model=schemas.EmailConfigResponse)
def update_email_config(
    config: schemas.EmailConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update the email configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    existing_config = db.query(models.EmailConfig).first()
    # Upsert: create if missing, otherwise update
    if not existing_config:
        new_config = models.EmailConfig(**config.dict(exclude_unset=True))
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        return new_config
    
    for key, value in config.dict(exclude_unset=True).items():
        setattr(existing_config, key, value)
    
    db.commit()
    db.refresh(existing_config)
    return existing_config

@router.delete("/email-config", status_code=status.HTTP_204_NO_CONTENT)
def delete_email_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete the email configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    config = db.query(models.EmailConfig).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email configuration not found"
        )
    
    db.delete(config)
    db.commit()
    return None

# General Configuration Endpoints
@router.post("/general-config", response_model=schemas.GeneralConfigResponse)
def create_general_config(
    config: schemas.GeneralConfigCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new general configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    # Check if config already exists
    existing_config = db.query(models.GeneralConfig).first()
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="General configuration already exists. Use PUT to update."
        )
    
    new_config = models.GeneralConfig(**config.dict())
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config

@router.get("/general-config", response_model=schemas.GeneralConfigResponse)
def get_general_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get the general configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view system settings"
        )
    
    config = db.query(models.GeneralConfig).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="General configuration not found"
        )
    return config

@router.put("/general-config", response_model=schemas.GeneralConfigResponse)
def update_general_config(
    config: schemas.GeneralConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update the general configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    existing_config = db.query(models.GeneralConfig).first()
    if not existing_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="General configuration not found. Use POST to create."
        )
    
    for key, value in config.dict(exclude_unset=True).items():
        setattr(existing_config, key, value)
    
    db.commit()
    db.refresh(existing_config)
    return existing_config

@router.delete("/general-config", status_code=status.HTTP_204_NO_CONTENT)
def delete_general_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete the general configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    config = db.query(models.GeneralConfig).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="General configuration not found"
        )
    
    db.delete(config)
    db.commit()
    return None

# Notification Configuration Endpoints
@router.post("/notification-config", response_model=schemas.NotificationConfigResponse)
def create_notification_config(
    config: schemas.NotificationConfigCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new notification configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    # Check if config already exists
    existing_config = db.query(models.NotificationConfig).first()
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notification configuration already exists. Use PUT to update."
        )
    
    new_config = models.NotificationConfig(**config.dict())
    db.add(new_config)
    db.commit()
    db.refresh(new_config)
    return new_config

@router.get("/notification-config", response_model=schemas.NotificationConfigResponse)
def get_notification_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get the notification configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view system settings"
        )
    
    config = db.query(models.NotificationConfig).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification configuration not found"
        )
    return config

@router.put("/notification-config", response_model=schemas.NotificationConfigResponse)
def update_notification_config(
    config: schemas.NotificationConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update the notification configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    existing_config = db.query(models.NotificationConfig).first()
    if not existing_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification configuration not found. Use POST to create."
        )
    
    for key, value in config.dict(exclude_unset=True).items():
        setattr(existing_config, key, value)
    
    db.commit()
    db.refresh(existing_config)
    return existing_config

@router.delete("/notification-config", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification_config(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete the notification configuration"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage system settings"
        )
    
    config = db.query(models.NotificationConfig).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification configuration not found"
        )
    
    db.delete(config)
    db.commit()
    return None

# PUBLIC Endpoint - Genel config'i döndür (authentication gerektirmez)
# Kullanıcıların talep oluştururken varsayılan birim vs görebilmesi için
@router.get("/public/config", response_model=dict)
def get_public_settings(db: Session = Depends(get_db)):
    """Get public settings (no authentication required)"""
    general_config = db.query(models.GeneralConfig).first()
    if not general_config:
        general_config = models.GeneralConfig(
            app_name="Destek Sistemi",
            app_version="1.0.0",
            maintenance_mode=False,
            maintenance_message="Sistem bakım modunda.",
            max_file_size_mb=10,
            allowed_file_types="pdf,doc,docx,txt,jpg,jpeg,png,gif",
            email_notifications_enabled=True,
            ldap_enabled=False,
            enable_teos_id=False,
            enable_citizenship_no=False,
            require_teos_id=False,
            require_citizenship_no=False
        )
        db.add(general_config)
        db.commit()
    
    return {
        "enable_teos_id": general_config.enable_teos_id,
        "enable_citizenship_no": general_config.enable_citizenship_no,
        "require_teos_id": general_config.require_teos_id,
        "require_citizenship_no": general_config.require_citizenship_no,
        "general": {
            "app_name": general_config.app_name,
            "app_version": general_config.app_version,
            "maintenance_mode": general_config.maintenance_mode,
            "maintenance_message": general_config.maintenance_message,
            "max_file_size_mb": general_config.max_file_size_mb,
            "allowed_file_types": general_config.allowed_file_types,
            "email_notifications_enabled": general_config.email_notifications_enabled,
            "ldap_enabled": general_config.ldap_enabled,
            "default_department_id": general_config.default_department_id
        }
    }

# General Settings Endpoint (Admin only)
@router.get("/", response_model=dict)
@router.get("", response_model=dict)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get system settings"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view system settings"
        )
    
    # Get general config
    general_config = db.query(models.GeneralConfig).first()
    if not general_config:
        # Create default config
        general_config = models.GeneralConfig(
            app_name="Destek Sistemi",
            app_version="1.0.0",
            maintenance_mode=False,
            maintenance_message="Sistem bakım modunda.",
            max_file_size_mb=10,
            allowed_file_types="pdf,doc,docx,txt,jpg,jpeg,png,gif",
            email_notifications_enabled=True,
            ldap_enabled=False,
            enable_teos_id=False,
            enable_citizenship_no=False,
            require_teos_id=False,
            require_citizenship_no=False
        )
        db.add(general_config)
        db.commit()
        db.refresh(general_config)
    
    # Email config: prefer email_config table, fallback to general_config fields
    email_config = db.query(models.EmailConfig).first()
    email_response = {
        "smtp_server": "",
        "smtp_port": 587,
        "smtp_username": "",
        "smtp_password": "",
        "smtp_use_tls": True,
        "from_email": "",
        "from_name": "Destek Sistemi"
    }
    if email_config:
        email_response.update({
            "smtp_server": email_config.smtp_server or "",
            "smtp_port": email_config.smtp_port or 587,
            "smtp_username": email_config.smtp_username or "",
            "smtp_password": email_config.smtp_password or "",
            "smtp_use_tls": email_config.smtp_use_tls if email_config.smtp_use_tls is not None else True,
            "from_email": email_config.from_email or "",
            "from_name": email_config.from_name or "Destek Sistemi"
        })
    else:
        # Fallback to general_config fields if email_config not created yet
        email_response.update({
            "smtp_server": general_config.smtp_server or "",
            "smtp_port": general_config.smtp_port or 587,
            "smtp_username": general_config.smtp_username or "",
            "smtp_password": general_config.smtp_password or "",
            "smtp_use_tls": True,
            "from_email": general_config.smtp_username or "",
            "from_name": general_config.app_name or "Destek Sistemi"
        })

    return {
        "enable_teos_id": general_config.enable_teos_id,
        "enable_citizenship_no": general_config.enable_citizenship_no,
        "require_teos_id": general_config.require_teos_id,
        "require_citizenship_no": general_config.require_citizenship_no,
        "general": {
            "app_name": general_config.app_name,
            "app_version": general_config.app_version,
            "maintenance_mode": general_config.maintenance_mode,
            "maintenance_message": general_config.maintenance_message,
            "max_file_size_mb": general_config.max_file_size_mb,
            "allowed_file_types": general_config.allowed_file_types,
            "email_notifications_enabled": general_config.email_notifications_enabled,
            "ldap_enabled": general_config.ldap_enabled,
            "upload_directory": general_config.upload_directory,
            "default_department_id": general_config.default_department_id,
            "require_manager_assignment": general_config.require_manager_assignment,
            # Workflow & Triage
            "workflow_enabled": general_config.workflow_enabled,
            "triage_user_id": general_config.triage_user_id,
            "triage_department_id": general_config.triage_department_id,
            # Escalation
            "escalation_enabled": general_config.escalation_enabled,
            "escalation_target_user_id": general_config.escalation_target_user_id,
            "escalation_target_department_id": general_config.escalation_target_department_id,
            # Timeouts
            "timeout_critical": general_config.timeout_critical,
            "timeout_high": general_config.timeout_high,
            "timeout_medium": general_config.timeout_medium,
            "timeout_low": general_config.timeout_low,
            "custom_logo_url": general_config.custom_logo_url
        },
        "email": email_response,
        "notifications": {
            "enable_email": general_config.email_notifications_enabled,
            "enable_push": True,
            "enable_sms": False
        }
    }

@router.post("/test-email")
def test_email_config(
    test_email: schemas.TestEmailRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Test the email configuration by sending a test email"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only administrators can test email configuration"
        )
    
    email_config = db.query(models.EmailConfig).first()
    if not email_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email configuration not found"
        )
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        logger.info(f"Starting test email to {test_email.recipient_email}")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Test Email - Destek Sistemi"
        msg['From'] = email_config.from_email
        msg['To'] = test_email.recipient_email
        
        # Email body
        text = "Bu bir test e-postasıdır. Destek Sistem kurulumu başarılı!"
        html = f"""\
        <html>
          <body>
            <h2>Test E-postası</h2>
            <p>Bu bir test e-postasıdır.</p>
            <p><strong>Destek Sistemi kurulumu başarılı!</strong></p>
            <p>Gönderen: {email_config.from_email}</p>
          </body>
        </html>
        """
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        logger.info(f"Connecting to SMTP: {email_config.smtp_server}:{email_config.smtp_port}")
        
        # Connect to SMTP server - timeout'ı 10 saniyeye çıkartıyoruz
        if email_config.smtp_use_tls:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(email_config.smtp_server, email_config.smtp_port, timeout=10)
        
        # Authenticate if needed
        if email_config.smtp_username and email_config.smtp_password:
            logger.info(f"Authenticating as {email_config.smtp_username}")
            server.login(email_config.smtp_username, email_config.smtp_password)
        
        logger.info(f"Sending email from {email_config.from_email} to {test_email.recipient_email}")
        # Send email
        server.sendmail(email_config.from_email, test_email.recipient_email, msg.as_string())
        
        # Quit server - hata olsa da mail gitmişti
        try:
            server.quit()
        except Exception as quit_error:
            logger.warning(f"Server quit error (mail already sent): {str(quit_error)}")
        
        logger.info("Test email sent successfully")
        return {"message": f"Test email sent successfully to: {test_email.recipient_email}"}
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP auth failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP authentication failed. Check your username and password."
        )
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SMTP error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Email send failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )