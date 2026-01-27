"""
Centralized email templates for the Destek (Support) System.
Includes both HTML and plain text versions.
"""

def get_base_styles():
    return """
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .header.blue { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }
        .header.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .header.purple { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .header.orange { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .header h2 { margin: 0; font-size: 24px; }
        .content { background: #f8f9fa; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
        .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #2563eb; }
        .details.green { border-left-color: #10b981; }
        .details.purple { border-left-color: #667eea; }
        .details.orange { border-left-color: #f59e0b; }
        .details p { margin: 8px 0; }
        .label { font-weight: bold; color: #2563eb; }
        .label.green { color: #10b981; }
        .label.purple { color: #667eea; }
        .label.orange { color: #f59e0b; }
        .button { display: inline-block; margin: 20px 0; padding: 12px 30px; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .button.blue { background: #2563eb; }
        .button.green { background: #10b981; }
        .button.purple { background: #667eea; }
        .button.orange { background: #f59e0b; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .comment-box { background: #fff; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0; border-radius: 4px; font-style: italic; }
    """

def get_html_wrapper(title, content, header_class="blue"):
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <style>{get_base_styles()}</style>
</head>
<body>
    <div class="container">
        <div class="header {header_class}">
            <h2>{title}</h2>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>Bu otomatik olarak gönderilmiş bir bildirimdir. Lütfen yanıtlamayınız.</p>
            <p style="margin: 5px 0;">Destek Sistemi</p>
        </div>
    </div>
</body>
</html>"""

# --- TICKET CREATED TEMPLATES ---

def get_ticket_created_user_template(ticket, app_url):
    """Kullanıcıya: Talebiniz alındı"""
    title = "🆕 Talebiniz Alındı"
    text = f"""Merhaba {ticket.creator.full_name},
    
"{ticket.title}" başlıklı talebiniz başarıyla oluşturuldu ve sisteme kaydedildi. 
Talebiniz en kısa sürede incelenip tarafınıza dönüş yapılacaktır.

Talep Detayları:
- Başlık: {ticket.title}
- Departman: {ticket.department.name if ticket.department else 'Genel'}
- Öncelik: {ticket.priority}

Talebi takip etmek için: {app_url}/tickets/{ticket.id}
"""
    html_content = f"""
        <p>Merhaba <strong>{ticket.creator.full_name}</strong>,</p>
        <p><strong>"{ticket.title}"</strong> başlıklı talebiniz başarıyla oluşturuldu ve sisteme kaydedildi.</p>
        <div class="details">
            <p><span class="label">📋 Başlık:</span> {ticket.title}</p>
            <p><span class="label">🏢 Departman:</span> {ticket.department.name if ticket.department else 'Genel'}</p>
            <p><span class="label">⚠️ Öncelik:</span> {ticket.priority}</p>
        </div>
        <p style="text-align: center;">
            <a href="{app_url}/tickets/{ticket.id}" class="button blue">Talebi Görüntüle</a>
        </p>
    """
    return text, get_html_wrapper(title, html_content, "blue")

def get_ticket_created_staff_template(ticket, app_url):
    """Personele: Yeni talep atandı"""
    title = "📌 Yeni Talep Atandı"
    text = f"""Merhaba {ticket.assignee.full_name},
    
Size "{ticket.title}" başlıklı yeni bir destek talebi atanmıştır.

Talep Detayları:
- Başlık: {ticket.title}
- Oluşturan: {ticket.creator.full_name}
- Departman: {ticket.department.name if ticket.department else 'Genel'}
- Öncelik: {ticket.priority}

Talebi incelemek için: {app_url}/tickets/{ticket.id}
"""
    html_content = f"""
        <p>Merhaba <strong>{ticket.assignee.full_name}</strong>,</p>
        <p>Size <strong>"{ticket.title}"</strong> başlıklı yeni bir destek talebi atanmıştır.</p>
        <div class="details purple">
            <p><span class="label purple">📋 Başlık:</span> {ticket.title}</p>
            <p><span class="label purple">👤 Oluşturan:</span> {ticket.creator.full_name}</p>
            <p><span class="label purple">🏢 Departman:</span> {ticket.department.name if ticket.department else 'Genel'}</p>
            <p><span class="label purple">⚠️ Öncelik:</span> {ticket.priority}</p>
        </div>
        <p style="text-align: center;">
            <a href="{app_url}/tickets/{ticket.id}" class="button purple">Talebi İncele</a>
        </p>
    """
    return text, get_html_wrapper(title, html_content, "purple")

def get_ticket_created_triage_template(ticket, app_url):
    """Triaj personeline: Yönlendirilecek talep var"""
    title = "📢 Yeni Talep (Yönlendirme Bekliyor)"
    text = f"""Merhaba,
    
Sisteme "{ticket.title}" başlıklı yeni bir talep düştü. Talep yönlendirme (Triaj) beklemektedir.

Talep Detayları:
- Başlık: {ticket.title}
- Oluşturan: {ticket.creator.full_name}
- Birim: {ticket.department.name if ticket.department else 'Genel'}

Talebi yönlendirmek için: {app_url}/tickets/{ticket.id}
"""
    html_content = f"""
        <p>Merhaba,</p>
        <p>Sisteme <strong>"{ticket.title}"</strong> başlıklı yeni bir talep düştü. Talep yönlendirme (Triaj) beklemektedir.</p>
        <div class="details green">
            <p><span class="label green">📋 Başlık:</span> {ticket.title}</p>
            <p><span class="label green">👤 Oluşturan:</span> {ticket.creator.full_name}</p>
            <p><span class="label green">🏢 Birim:</span> {ticket.department.name if ticket.department else 'Genel'}</p>
        </div>
        <p style="text-align: center;">
            <a href="{app_url}/tickets/{ticket.id}" class="button green">Talebi Yönlendir</a>
        </p>
    """
    return text, get_html_wrapper(title, html_content, "green")

# --- COMMENT TEMPLATES ---

def get_comment_notification_template(ticket, commenter, recipient, comment, app_url):
    title = "💬 Yeni Yorum Eklendi"
    text = f"""Merhaba {recipient.full_name},
    
"{ticket.title}" başlıklı talebinize {commenter.full_name} tarafından yeni bir yorum eklendi.

Talep: {ticket.title}
Yorum: {comment.content}

Görüşmeleri görmek için: {app_url}/tickets/{ticket.id}
"""
    html_content = f"""
        <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
        <p><strong>"{ticket.title}"</strong> başlıklı talebinize bir yorum eklendi.</p>
        <div class="comment-box">
            <p style="margin-bottom: 5px; font-weight: bold; color: #666;">{commenter.full_name} dedi ki:</p>
            {comment.content}
        </div>
        <p style="text-align: center;">
            <a href="{app_url}/tickets/{ticket.id}" class="button green">Mesajlara Git</a>
        </p>
    """
    return text, get_html_wrapper(title, html_content, "green")

# --- UPDATE TEMPLATES ---

def get_ticket_updated_template(ticket, updater, recipient, app_url, changes_desc):
    title = "🔄 Talep Güncellendi"
    text = f"""Merhaba {recipient.full_name},
    
"{ticket.title}" başlıklı talebiniz {updater.full_name} tarafından güncellendi.

Güncelleme: {changes_desc}
Durum: {ticket.status}
Öncelik: {ticket.priority}

Talebi görüntüle: {app_url}/tickets/{ticket.id}
"""
    html_content = f"""
        <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
        <p><strong>"{ticket.title}"</strong> başlıklı talebinizde bir güncelleme yapıldı.</p>
        <div class="details">
            <p><span class="label">👤 Güncelleyen:</span> {updater.full_name}</p>
            <p><span class="label">📝 İşlem:</span> {changes_desc}</p>
            <p><span class="label">🔔 Durum:</span> {ticket.status}</p>
        </div>
        <p style="text-align: center;">
            <a href="{app_url}/tickets/{ticket.id}" class="button blue">Talebi Görüntüle</a>
        </p>
    """
    return text, get_html_wrapper(title, html_content, "blue")

# --- ATTACHMENT TEMPLATES ---

def get_attachment_notification_template(ticket, uploader, recipient, attachment, app_url):
    title = "📎 Dosya Eklendi"
    text = f"""Merhaba {recipient.full_name},
    
"{ticket.title}" başlıklı talebinize {uploader.full_name} tarafından yeni bir dosya eklendi.

Talebe git: {app_url}/tickets/{ticket.id}
"""
    html_content = f"""
        <p>Merhaba <strong>{recipient.full_name}</strong>,</p>
        <p><strong>"{ticket.title}"</strong> başlıklı talebinize yeni bir dosya eklendi.</p>
        <div class="details orange">
            <p><span class="label orange">👤 Yükleyen:</span> {uploader.full_name}</p>
            <p><span class="label orange">📄 Dosya Adı:</span> {attachment.filename}</p>
        </div>
        <p style="text-align: center;">
            <a href="{app_url}/tickets/{ticket.id}" class="button orange">Talebi Görüntüle</a>
        </p>
    """
    return text, get_html_wrapper(title, html_content, "orange")
