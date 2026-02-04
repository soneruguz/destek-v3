from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
import os
import uuid
from pathlib import Path
import shutil
import re
from bs4 import BeautifulSoup
import logging

from database import get_db
import models, schemas
from auth import get_current_active_user

logger = logging.getLogger("uvicorn")

router = APIRouter(tags=["tickets"])

def get_upload_dir(db: Session) -> str:
    """Sistem ayarlarından upload dizinini al"""
    # Öncelik: ortam değişkeni (docker-compose ile mount edilen yol) -> DB ayarı -> varsayılan
    env_dir = os.getenv("UPLOAD_DIR")
    db_dir = None
    config = db.query(models.GeneralConfig).first()
    if config and config.upload_directory:
        db_dir = config.upload_directory

    upload_dir = env_dir or db_dir or "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

def clean_html_content(html_content: str) -> str:
    """HTML içeriğini temizle - sadece plain text döndür"""
    if not html_content:
        return ""
    
    # Quill'in boş HTML'lerini sil
    cleaned = html_content.strip()
    
    # Boş etiketleri kaldır
    cleaned = re.sub(r'<p>\s*<br>\s*</p>', '', cleaned)
    cleaned = re.sub(r'<p>\s*</p>', '', cleaned)
    cleaned = re.sub(r'<p>&nbsp;</p>', '', cleaned)
    
    if not cleaned or cleaned == '':
        return ""
    
    # BeautifulSoup ile HTML'i parse et ve text'i çıkar
    soup = BeautifulSoup(cleaned, 'html.parser')
    # HTML tag'lerini kaldır, sadece text tut
    text_content = soup.get_text().strip()
    
    return text_content

# Kullanıcının bir departmana ait olup olmadığını kontrol eden yardımcı fonksiyon
def user_in_department(user: models.User, department_id: int):
    return user.department_id == department_id

# Kullanıcının bir destek talebine erişim yetkisi olup olmadığını kontrol eden fonksiyon
def can_access_ticket(db: Session, user: models.User, ticket_id: int):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        return False
    
    # Eğer kullanıcı yöneticiyse her talebe erişebilir (private/gizli olanlar dahil)
    if user.is_admin:
        return True
    
    # Kullanıcı destek talebinin sahibiyse erişebilir (private olsa bile)
    if ticket.creator_id == user.id:
        return True
    
    # Kullanıcı destek talebine atanmışsa erişebilir (private olsa bile)
    if ticket.assignee_id == user.id:
        return True
    
    # ÖNEMLİ: PRIVATE/GİZLİ TALEP KONTROLÜ - DİREKT RED!
    # Eğer talep private/gizli ise, SADECE yaratıcı, atanan kişi ve adminler görebilir
    # Başka hiç kimse (aynı departmandakiler dahil) asla göremez!
    if ticket.is_private:
        return False
    
    # ÖNEMLİ: KİŞİSEL TALEP KONTROLÜ - DİREKT RED!
    # Eğer talep kişisel (assignee_id dolu) ise, SADECE ilgili kişiler görebilir
    # Aynı departmandaki diğer kişiler asla göremez!
    if ticket.assignee_id is not None:
        return False
    
    # DEPARTMAN YÖNETİCİSİ: Kendi departmanındaki TÜM taleplerine (kişisel dahil) erişebilir
    # Ancak private taleplerden hariç (private taleplere sadece admin, yaratıcı, atanan erişebilir)
    if ticket.department and ticket.department.manager_id == user.id:
        return True
    
    # GENEL DEPARTMAN TALEPLERİ:
    # Yalnızca genel (non-private, non-personal) talepler departman üyeleri tarafından görülebilir
    if user.department_id is not None and user.department_id == ticket.department_id:
        return True
    
    return False

@router.post("/", response_model=schemas.Ticket)
def create_ticket(
    ticket: schemas.TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"Ticket oluşturma isteği alındı - Kullanıcı: {current_user.username}")
    logger.info(f"Gelen veri: {ticket.dict()}")
    
    # Departmanın varlığını kontrol et
    department = db.query(models.Department).filter(models.Department.id == ticket.department_id).first()
    if not department:
        logger.error(f"Departman bulunamadı: {ticket.department_id}")
        raise HTTPException(status_code=404, detail="Departman bulunamadı")
    
    try:
        # HTML içeriğini temizle
        cleaned_description = clean_html_content(ticket.description)
        
        # Sistem ayarlarını al
        config = db.query(models.GeneralConfig).first()
        require_manager_assignment = config.require_manager_assignment if config else False
        
        # Triage Logic:
        # 1. Eğer merkezi yönlendirme aktifse (workflow_enabled):
        #    a. Eğer merkezi yönlendirici (triage_user) varsa ona ata
        #    b. Eğer merkezi yönlendirici birim (triage_department) varsa oraya yönlendir
        # 2. Aktif değilse veya ayar yoksa eski mantık (manager assignment veya spesifik atama)
        
        assignee_id = ticket.assignee_id
        target_department_id = ticket.department_id
        
        if config and config.workflow_enabled:
            if config.triage_user_id:
                assignee_id = config.triage_user_id
                logger.info(f"Talep merkezi yönlendiriciye atandı: {assignee_id}")
            elif config.triage_department_id:
                target_department_id = config.triage_department_id
                assignee_id = None
                logger.info(f"Talep merkezi yönlendirme birimine gönderildi: {target_department_id}")
        
        # Eğer hala atama değişmemişse veya workflow kapalıysa eski yönetici atama mantığını kontrol et
        if assignee_id == ticket.assignee_id and require_manager_assignment and department.manager_id:
            assignee_id = department.manager_id
            logger.info(f"Talep birim yöneticisine atandı: {department.manager_id}")

        import pytz
        istanbul_tz = pytz.timezone('Europe/Istanbul')
        now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
        new_ticket = models.Ticket(
            title=ticket.title,
            description=cleaned_description,
            status="open",
            priority=ticket.priority,
            creator_id=current_user.id,
            department_id=target_department_id,
            assignee_id=assignee_id,
            is_private=ticket.is_private,
            created_at=now_istanbul
        )
        
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        logger.info(f"Ticket başarıyla oluşturuldu: {new_ticket.id}")
        
        # Relationship'leri yükle
        from sqlalchemy.orm import joinedload
        created_ticket = db.query(models.Ticket).options(
            joinedload(models.Ticket.creator),
            joinedload(models.Ticket.department),
            joinedload(models.Ticket.assignee)
        ).filter(models.Ticket.id == new_ticket.id).first()

        # Bildirimleri gönder
        from utils.notifications import notify_users_about_ticket
        
        # Atanan kişiye ve diğer ilgililere bildirim gönder
        title = f"Yeni Talep: {created_ticket.title}"
        message = f"{current_user.full_name} tarafından yeni bir talep oluşturuldu."
        if created_ticket.assignee_id:
            message = f"{current_user.full_name} tarafından oluşturulan talep size atandı."

        background_tasks.add_task(
            notify_users_about_ticket,
            None, # db yerine None geçiyoruz (arka planda yeni session açacak)
            background_tasks,
            created_ticket.id,
            schemas.NotificationTypeEnum.TICKET_CREATED if not created_ticket.assignee_id else schemas.NotificationTypeEnum.TICKET_ASSIGNED,
            title,
            message,
            current_user.id, # Kendisine bildirim gitmesin
            'creation' # Context ekledik!
        )
        
        return schemas.Ticket.from_ticket(created_ticket)
        
    except Exception as e:
        logger.error(f"Ticket oluşturulurken hata: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ticket oluşturulurken hata: {str(e)}")

@router.get("/", response_model=List[schemas.Ticket])
def get_tickets(
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    import logging
    from sqlalchemy.orm import joinedload
    logger = logging.getLogger("main")

    logger.info(f"Tickets listesi istendi - Kullanıcı: {current_user.username}, admin: {current_user.is_admin}")

    # Admin ise tüm talepleri döndür (private olanlar dahil)
    if current_user.is_admin:
        query = db.query(models.Ticket).options(
            joinedload(models.Ticket.department),
            joinedload(models.Ticket.assignee)
        )
        if status:
            query = query.filter(models.Ticket.status == status)
        tickets = query.all()
        # Admin için is_personal mantığını doğru şekilde ayarla
        for t in tickets:
            t.is_personal = t.assignee_id is not None
        logger.info(f"Admin - tüm talepler listelendi, toplam {len(tickets)} talep döndürüldü")
        return [schemas.Ticket.from_ticket(ticket) for ticket in tickets]

    # Normal kullanıcılar için filtrelenmiş talepler
    accessible_tickets = []
    
    # 1. Kullanıcının oluşturduğu talepler (private olsa bile)
    created_query = db.query(models.Ticket).options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(models.Ticket.creator_id == current_user.id)
    if status:
        created_query = created_query.filter(models.Ticket.status == status)
    created_tickets = created_query.all()
    
    logger.info(f"DEBUG - Kullanıcı {current_user.id} için bulunan oluşturduğu talepler:")
    for ticket in created_tickets:
        logger.info(f"  Ticket ID: {ticket.id}, Title: {ticket.title}, Private: {ticket.is_private}, Assignee: {ticket.assignee_id}")
    
    accessible_tickets.extend(created_tickets)
    logger.info(f"Oluşturduğu talepler: {len(created_tickets)}")

    # 2. Kullanıcının atandığı talepler (private olsa bile)
    assigned_query = db.query(models.Ticket).options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(models.Ticket.assignee_id == current_user.id)
    if status:
        assigned_query = assigned_query.filter(models.Ticket.status == status)
    assigned_tickets = assigned_query.all()
    accessible_tickets.extend(assigned_tickets)
    logger.info(f"Atandığı talepler: {len(assigned_tickets)}")

    # 3. SADECE Departman genel taleplerine erişim (private değil, personal değil, paylaşım yok)
    if current_user.department_id:
        logger.info(f"DEBUG - Kullanıcı departmanı: {current_user.department_id}")
        dept_query = db.query(models.Ticket).options(
            joinedload(models.Ticket.department),
            joinedload(models.Ticket.assignee)
        ).filter(
            models.Ticket.department_id == current_user.department_id,
            models.Ticket.is_private == False,  # Gizli değil
            models.Ticket.assignee_id == None,   # Kişiye atanmamış (genel departman talebi)
            models.Ticket.creator_id != current_user.id  # Kendi oluşturduğu değil (çakışma önleme)
        )
        if status:
            dept_query = dept_query.filter(models.Ticket.status == status)
        dept_tickets = dept_query.all()
        
        # EK GÜVENLİK: Her ticket için tekrar kontrol
        filtered_dept_tickets = []
        for ticket in dept_tickets:
            # Private ticket'ları kesinlikle reddet
            if ticket.is_private:
                logger.info(f"  REDDEDILDI - Private ticket: {ticket.id}")
                continue
            # Personal ticket'ları kesinlikle reddet  
            if ticket.assignee_id is not None:
                logger.info(f"  REDDEDILDI - Personal ticket: {ticket.id}")
                continue
            # Sadece genel departman ticket'larını kabul et
            filtered_dept_tickets.append(ticket)
            logger.info(f"  KABUL - Genel departman ticket: {ticket.id}, Title: {ticket.title}")
        
        accessible_tickets.extend(filtered_dept_tickets)
        logger.info(f"Departman genel talepleri: {len(filtered_dept_tickets)}")
    else:
        logger.info("Kullanıcının departmanı yok")

    # Aynı ticket iki kez gelmesin - unique IDs
    ticket_map = {}
    for t in accessible_tickets:
        if t.id not in ticket_map:
            # is_personal mantığını assignee_id'ye göre ayarla
            t.is_personal = t.assignee_id is not None
            ticket_map[t.id] = t

    final_tickets = list(ticket_map.values())
    logger.info(f"Kullanıcı {current_user.username} için toplam {len(final_tickets)} erişilebilir talep döndürüldü")
    
    # Clean ticket objects oluştur
    return [schemas.Ticket.from_ticket(ticket) for ticket in final_tickets]

@router.get("/{ticket_id}", response_model=schemas.Ticket)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    from sqlalchemy.orm import joinedload
    
    ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.creator),
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(models.Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    # is_personal mantığını assignee_id'ye göre ayarla
    ticket.is_personal = ticket.assignee_id is not None
    
    # Debug için log ekle
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info(f"Ticket {ticket_id} detayı istendi - assignee_id: {ticket.assignee_id}, is_personal: {ticket.is_personal}, is_private: {ticket.is_private}")
    
    return schemas.Ticket.from_ticket(ticket)

@router.put("/{ticket_id}", response_model=schemas.Ticket)
async def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    import logging
    logger = logging.getLogger("uvicorn")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")

    # Önce triaj kontrolünü yapalım (diğer kontrollerde kullanacağız)
    is_triage_person = False
    from sqlalchemy.orm import joinedload
    config = db.query(models.GeneralConfig).first()
    
    if config and config.workflow_enabled:
        # Triaj personeli: ya triage_user_id ile eşleşen ya da triage_department_id'deki kullanıcı
        if config.triage_user_id and current_user.id == config.triage_user_id:
            is_triage_person = True
        elif config.triage_department_id and current_user.department_id == config.triage_department_id:
            is_triage_person = True
    
    # Kapalı talepte sadece yöneticiler değişiklik yapabilir
    if ticket.status == "closed" and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Talep kapatıldı. Sadece yöneticiler değişiklik yapabilir.")
    
    # Açık talepte sadece durum değişikliği yapılabilir (işlemde durumuna almak için)
    # Ancak triaj personeli ve adminler bu kuralla kısıtlanmaz
    if ticket.status == "open" and not current_user.is_admin and not is_triage_person:
        # Eğer sadece status değiştiriyorsa izin ver
        is_only_status_change = (
            ticket_update.status is not None and
            ticket_update.title is None and
            ticket_update.description is None and
            ticket_update.priority is None and
            ticket_update.department_id is None and
            ticket_update.assignee_id is None and
            ticket_update.is_private is None
        )
        if not is_only_status_change:
            raise HTTPException(status_code=403, detail="Talep henüz açık durumda. Önce 'İşlemde' olarak işaretleyin.")

    logger.info(f"Ticket {ticket_id} güncellemesi - Kullanıcı: {current_user.username} (ID: {current_user.id})")
    logger.info(f"Ticket creator_id: {ticket.creator_id}, department_id: {ticket.department_id}")
    logger.info(f"Kullanıcı department_id: {current_user.department_id}, is_admin: {current_user.is_admin}")
    logger.info(f"is_triage_person: {is_triage_person}")
    logger.info(f"Güncelleme verileri: {ticket_update.dict(exclude_unset=True)}")

    # Kapanan talebi tekrar açmak sadece admin yetkisinde
    if ticket.status == "closed" and ticket_update.status and ticket_update.status != "closed":
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Kapanan talebi tekrar açma yetkiniz yok. Sadece admin açabilir.")

    # Yetki kontrolü: Admin, kendi oluşturduğu, atanan kişi, aynı departman veya triaj personeli
    # config zaten yukarıda alınmıştı, tekrar almaya gerek yok
    
    can_update = (
        current_user.is_admin or 
        ticket.creator_id == current_user.id or 
        ticket.assignee_id == current_user.id or
        (current_user.department_id is not None and user_in_department(current_user, ticket.department_id)) or
        is_triage_person  # Triaj personeli tüm talepler üzerinde işlem yapabilir
    )

    logger.info(f"Güncelleme yetkisi: {can_update}, is_triage_person: {is_triage_person}")

    if not can_update:
        raise HTTPException(status_code=403, detail="Bu destek talebini güncelleme yetkiniz yok")

    # Update fields if provided
    if ticket_update.title is not None:
        ticket.title = ticket_update.title
    if ticket_update.description is not None:
        # HTML içeriğini temizle
        ticket.description = clean_html_content(ticket_update.description)
    notif_type = schemas.NotificationTypeEnum.TICKET_UPDATED
    notif_title = f"Talep Güncellendi: {ticket.title}"
    notif_message = f"{current_user.full_name} talebi güncelledi."

    if ticket_update.status is not None:
        ticket.status = ticket_update.status
        notif_message = f"{current_user.full_name} talebin durumunu '{ticket.status}' olarak güncelledi."
        # Kapanış tarihini güncelle
        if ticket_update.status == "closed":
            ticket.closed_at = datetime.now()
        else:
            ticket.closed_at = None
    
    if ticket_update.priority is not None:
        ticket.priority = ticket_update.priority
    if ticket_update.is_private is not None:
        ticket.is_private = ticket_update.is_private
    if ticket_update.department_id is not None:
        # Yeni departmanın varlığını kontrol et
        department = db.query(models.Department).filter(models.Department.id == ticket_update.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Departman bulunamadı")
        ticket.department_id = ticket_update.department_id
        notif_message = f"{current_user.full_name} talebi başka bir birime yönlendirdi."

    if ticket_update.assignee_id is not None:
        # Atanacak kullanıcının varlığını kontrol et
        user = db.query(models.User).filter(models.User.id == ticket_update.assignee_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Eğer assignee değişiyorsa
        if ticket_update.assignee_id != ticket.assignee_id:
            ticket.assignee_id = ticket_update.assignee_id
            notif_type = schemas.NotificationTypeEnum.TICKET_ASSIGNED
            notif_title = f"Talep Size Atandı: {ticket.title}"
            notif_message = f"{current_user.full_name} bu talebi size atadı."
        else:
            ticket.assignee_id = ticket_update.assignee_id

    # updated_at için de Istanbul timezone kullan
    import pytz
    istanbul_tz = pytz.timezone('Europe/Istanbul')
    ticket.updated_at = datetime.now(istanbul_tz).replace(tzinfo=None)
    
    db.commit()
    db.refresh(ticket)

    # Bildirim gönder
    from utils.notifications import notify_users_about_ticket
    background_tasks.add_task(
        notify_users_about_ticket,
        None,
        background_tasks,
        ticket.id,
        notif_type,
        notif_title,
        notif_message,
        current_user.id,
        'update' # Context ekledik!
    )
    
    db.commit()
    db.refresh(ticket)

    # Relationship'leri yükle
    from sqlalchemy.orm import joinedload
    updated_ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.creator),
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(models.Ticket.id == ticket_id).first()

    # Webhook tetikle (API'den açılmış taleplar için)
    if updated_ticket.api_client_id:
        from routers.external_api import trigger_ticket_webhook
        
        # Olay tipini belirle
        webhook_event = "ticket.updated"
        changes = {}
        
        if ticket_update.status is not None:
            if ticket_update.status == "closed":
                webhook_event = "ticket.closed"
            elif ticket.status == "closed" and ticket_update.status != "closed":
                webhook_event = "ticket.reopened"
            else:
                webhook_event = "ticket.status_changed"
            changes["status"] = ticket_update.status
        
        if ticket_update.assignee_id is not None:
            webhook_event = "ticket.assigned"
            changes["assignee_id"] = ticket_update.assignee_id
        
        trigger_ticket_webhook(db, updated_ticket, webhook_event, changes)

    # NOT: Eski mail gönderme mantığı kaldırıldı (.notifications.py üzerinden yönetiliyor)
    return schemas.Ticket.from_ticket(updated_ticket)

@router.post("/share", status_code=status.HTTP_200_OK)
def share_ticket(
    share_data: schemas.TicketShare,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == share_data.ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    # ÖNEMLİ: PRIVATE/GİZLİ TALEPLER PAYLAŞILAMAZ!
    if ticket.is_private:
        raise HTTPException(status_code=403, detail="Gizli/özel talepler paylaşılamaz")
    
    # Sadece talebi oluşturan kişi veya yöneticiler paylaşabilir
    if not current_user.is_admin and ticket.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu destek talebini paylaşma yetkiniz yok")
    
    # Kullanıcılarla paylaşım
    if share_data.user_ids:
        for user_id in share_data.user_ids:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                ticket.shared_with_users.append(user)
    
    # Departmanlarla paylaşım
    if share_data.department_ids:
        for dept_id in share_data.department_ids:
            dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
            if dept:
                ticket.shared_with_departments.append(dept)
    
    db.commit()
    return {"message": "Destek talebi başarıyla paylaşıldı"}

@router.post("/{ticket_id}/comment", response_model=schemas.Comment)
def add_comment(
    ticket_id: int,
    comment: schemas.CommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine yorum ekleme yetkiniz yok")
    
    new_comment = models.Comment(
        content=comment.content,
        user_id=current_user.id,
        ticket_id=ticket_id
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    # Webhook tetikle (API'den açılmış taleplar için)
    from sqlalchemy.orm import joinedload
    ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(models.Ticket.id == ticket_id).first()
    
    if ticket and ticket.api_client_id:
        from routers.external_api import trigger_ticket_webhook
        trigger_ticket_webhook(db, ticket, "comment.added", comment=new_comment)

    # Bildirim gönder
    from utils.notifications import notify_users_about_ticket
    background_tasks.add_task(
        notify_users_about_ticket,
        None,
        background_tasks,
        ticket_id,
        schemas.NotificationTypeEnum.TICKET_COMMENTED,
        f"Yeni Yorum: {new_comment.content[:30]}...",
        f"{current_user.full_name} talebe bir yorum ekledi.",
        current_user.id,
        'comment', # Context ekledik!
        new_comment.id # comment_id ekledik!
    )

    return new_comment

@router.post("/{ticket_id}/attachment")
async def add_attachment(
    ticket_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine dosya ekleme yetkiniz yok")

    # Upload dizinini alın ve ticket klasörü oluşturun
    upload_dir = Path(get_upload_dir(db))
    ticket_dir = upload_dir / f"ticket_{ticket_id}"
    ticket_dir.mkdir(parents=True, exist_ok=True)

    # Dosya yolu oluştur
    file_path = ticket_dir / file.filename

    # Dosyayı kaydet
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Veritabanına kaydet (relative path: ticket_<id>/filename)
    relative_path = f"ticket_{ticket_id}/{file.filename}"
    new_attachment = models.Attachment(
        filename=file.filename,
        file_path=relative_path,
        content_type=file.content_type,
        ticket_id=ticket_id,
        uploaded_by=current_user.id
    )

    db.add(new_attachment)
    db.commit()
    db.refresh(new_attachment)

    # Bildirim gönder - SADECE talep ilk oluşturulurken eklenen dosyalar için bildirim gönderme
    from utils.notifications import notify_users_about_ticket
    from datetime import datetime, timedelta
    import pytz
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    
    # İstanbul timezone'u kullan (ticket.created_at Istanbul timezone'unda kaydediliyor)
    istanbul_tz = pytz.timezone('Europe/Istanbul')
    now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
    
    # Eğer ticket 30 saniyeden daha yeni oluşturulduysa, dosya ekleme bildirimi gönderme
    if ticket and (now_istanbul - ticket.created_at) > timedelta(seconds=30):
        background_tasks.add_task(
            notify_users_about_ticket,
            None,
            background_tasks,
            ticket_id,
            schemas.NotificationTypeEnum.TICKET_UPDATED,
            f"Dosya Eklendi: {file.filename}",
            f"{current_user.full_name} talebe yeni bir dosya ekledi.",
            current_user.id,
            'attachment', # Context ekledik!
            None, # comment_id
            new_attachment.id # attachment_id ekledik!
        )

@router.post("/{ticket_id}/attachments/")
def upload_ticket_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Ticket'a dosya yükle"""
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    # Açık durumda talebe dosya eklenemez - admin hariç
    # if ticket.status == "open" and not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Talep henüz açık durumda. Önce 'İşlemde' olarak işaretleyin.")
    
    # Dosya boyutu kontrolü (10MB limit)
    if file.size and file.size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(status_code=413, detail="Dosya boyutu 10MB'dan büyük olamaz")
    
    # Dosya uzantısı kontrolü - sistem ayarlarından oku
    general_config = db.query(models.GeneralConfig).first()
    if general_config and general_config.allowed_file_types:
        allowed_extensions = [f".{ext.strip()}" for ext in general_config.allowed_file_types.split(",")]
    else:
        allowed_extensions = ['.pdf']  # Fallback
    
    file_extension = Path(file.filename).suffix.lower()
    logger = logging.getLogger("uvicorn")
    logger.info(f"Dosya yükleniyor: {file.filename}, uzantı: {file_extension}, izin verilenler: {allowed_extensions}")
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Bu dosya türü desteklenmiyor: {file_extension}. İzin verilenler: {', '.join(allowed_extensions)}")
    
    try:
        # Upload dizinini sistem ayarlarından al
        upload_dir = Path(get_upload_dir(db))
        upload_dir.mkdir(exist_ok=True)
        
        # Benzersiz dosya adı oluştur
        unique_filename = f"{ticket_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
        file_path = upload_dir / unique_filename
        
        # Dosyayı kaydet
        content = file.file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Database'e attachment kaydı ekle
        attachment = models.Attachment(
            ticket_id=ticket_id,
            filename=file.filename,
                file_path=unique_filename,  # Sadece dosya adı, uploads/ prefix'i olmadan
            file_size=len(content),
            content_type=file.content_type or "application/octet-stream",
            uploaded_by=current_user.id
        )
        
        db.add(attachment)
        db.commit()
        db.refresh(attachment)

        # Bildirim gönder - SADECE talep ilk oluşturulurken eklenen dosyalar için bildirim gönderme
        # Eğer ticket 30 saniyeden daha yeni oluşturulmuşsa, dosya ekleme bildirimi gönderme
        from utils.notifications import notify_users_about_ticket
        from datetime import timedelta
        import pytz
        
        istanbul_tz = pytz.timezone('Europe/Istanbul')
        now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
        ticket_age = now_istanbul - ticket.created_at
        
        # Sadece talep 30 saniyeden daha eski ise bildirim gönder (ilk oluşturma sırasındaki dosya eklemeleri hariç)
        if ticket_age > timedelta(seconds=30):
            background_tasks.add_task(
                notify_users_about_ticket,
                None, # db yerine None geçiyoruz (arka planda yeni session açacak)
                background_tasks,
                ticket_id,
                schemas.NotificationTypeEnum.TICKET_UPDATED,
                f"Dosya Eklendi: {file.filename}",
                f"{current_user.full_name} talebe yeni bir dosya ekledi.",
                current_user.id,
                'attachment',
                None,
                attachment.id
            )

        
        # Preview URL'si oluştur (resim dosyaları için)
        preview_url = None
        preview_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.webp'}
        if file_extension in preview_extensions:
            preview_url = f"/api/tickets/{ticket_id}/attachments/{attachment.id}/preview"
        
        return {
            "id": attachment.id,
            "filename": attachment.filename,
            "file_size": attachment.file_size,
            "content_type": attachment.content_type,
            "uploaded_at": attachment.created_at,
            "preview_url": preview_url
        }
        
    except Exception as e:
        # Hata durumunda dosyayı sil
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Dosya yüklenirken hata oluştu: {str(e)}")

@router.get("/{ticket_id}/attachments/{attachment_id}/preview")
def preview_attachment(
    ticket_id: int,
    attachment_id: int,
    db: Session = Depends(get_db)
):
    """Dosya önizlemesi (resim dosyaları için) - Public endpoint"""
    # Erişim kontrolü: Sadece attachment'ın ticket'ına erişimi olan kullanıcılar görebilir
    # Ama IMG tag'ine auth header geçilemediği için kontrol yapmıyoruz
    # Security: Attachment ID'ler guess etmek zor, dosyalar uploads klasöründe şifreli adlarla saklanıyor
    
    attachment = db.query(models.Attachment).filter(
        models.Attachment.id == attachment_id,
        models.Attachment.ticket_id == ticket_id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    upload_dir = Path(get_upload_dir(db))
    file_path = upload_dir / attachment.file_path
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya sunucuda bulunamadı")
    
    # Resim dosyaları için mimetype belirle
    file_extension = Path(attachment.filename).suffix.lower()
    mime_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.tiff': 'image/tiff',
        '.tif': 'image/tiff',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
    }
    
    # PDF dosyası için ilk sayfanın resimini oluştur
    if file_extension == '.pdf':
        try:
            from pdf2image import convert_from_path
            from PIL import Image
            import io
            
            # PDF'in ilk sayfasını resime çevir
            images = convert_from_path(str(file_path), first_page=1, last_page=1, dpi=150)
            if images:
                # Resimi memory'de sakla
                img = images[0]
                # Daha net önizleme için boyutu büyüttük
                img.thumbnail((1200, 1200))
                
                img_io = io.BytesIO()
                img.save(img_io, 'PNG')
                img_io.seek(0)
                
                return StreamingResponse(img_io, media_type='image/png')
        except Exception as e:
            logger = logging.getLogger("uvicorn")
            logger.warning(f"PDF preview oluşturulamadı: {str(e)}, original dosya dönülecek")
            # PDF olamıyorsa orijinal dosyayı dön
            return FileResponse(file_path, media_type=mime_types.get(file_extension, 'application/octet-stream'))

    # TIFF dosyaları tarayıcıda görüntülenmiyor; PNG'ye çevirip dön
    if file_extension in ['.tiff', '.tif']:
        try:
            from PIL import Image
            import io

            with Image.open(file_path) as img:
                # Transparanlık kaybını önlemek için RGBA'ya çeviriyoruz
                img = img.convert('RGBA')
                # TIFF önizleme çözünürlüğünü büyüttük
                img.thumbnail((1200, 1200))

                img_io = io.BytesIO()
                img.save(img_io, 'PNG')
                img_io.seek(0)

                return StreamingResponse(img_io, media_type='image/png')
        except Exception as e:
            logger = logging.getLogger("uvicorn")
            logger.warning(f"TIFF preview oluşturulamadı: {str(e)}, original dosya dönülecek")
            return FileResponse(file_path, media_type=mime_types.get(file_extension, 'application/octet-stream'))
    
    media_type = mime_types.get(file_extension, 'application/octet-stream')
    
    return FileResponse(file_path, media_type=media_type)

@router.get("/{ticket_id}/attachments/{attachment_id}/download")
def download_attachment(
    ticket_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Dosya indir"""
    attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    # Erişim kontrolü - ticket'a erişebildiğini kontrol et
    if not can_access_ticket(db, current_user, attachment.ticket_id):
        raise HTTPException(status_code=403, detail="Bu dosyaya erişim yetkiniz yok")
    
    upload_dir = Path(get_upload_dir(db))
    file_path = upload_dir / attachment.file_path
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya sunucuda bulunamadı")
    
    return FileResponse(
        file_path,
        media_type=attachment.content_type or 'application/octet-stream',
        filename=attachment.filename
    )

@router.get("/{ticket_id}/comments/")
def get_ticket_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    import logging
    logger = logging.getLogger("uvicorn")
    
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    from sqlalchemy.orm import joinedload
    comments = db.query(models.Comment).options(
        joinedload(models.Comment.user)
    ).filter(
        models.Comment.ticket_id == ticket_id
    ).order_by(models.Comment.created_at.asc()).all()
    
    logger.info(f"Comments found: {len(comments)}")
    
    # Response'u manuel oluştur
    result = []
    for comment in comments:
        result.append({
            "id": comment.id,
            "content": comment.content,
            "created_at": comment.created_at,
            "user_id": comment.user_id,
            "ticket_id": comment.ticket_id,
            "user": {
                "id": comment.user.id,
                "username": comment.user.username,
                "full_name": comment.user.full_name,
                "email": comment.user.email
            } if comment.user else None
        })
    
    return result

@router.post("/{ticket_id}/comments/")
def add_ticket_comment(
    ticket_id: int,
    comment_data: schemas.CommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    import logging
    logger = logging.getLogger("uvicorn")
    
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    # Açık durumda talebe yorum eklenemez
    if ticket.status == "open":
        raise HTTPException(status_code=403, detail="Talep henüz açık durumda. Önce 'İşlemde' olarak işaretleyin.")
    
    new_comment = models.Comment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    
    db.add(new_comment)
    db.commit()
    # user ilişkisini yükle
    from sqlalchemy.orm import joinedload
    new_comment_full = db.query(models.Comment).options(joinedload(models.Comment.user)).filter(models.Comment.id == new_comment.id).first()
    logger.info(f"Yorum eklendi: Ticket {ticket_id}, User {current_user.username}")
    
    # Yorum eklendiğinde bildirim gönder (creator + assignee)
    try:
        from routers.system_settings import send_comment_notification_email, send_ticket_updated_email
        recipients = []
        # Creator
        if ticket.creator and ticket.creator.email:
            recipients.append(ticket.creator)
        # Assignee
        if ticket.assignee and ticket.assignee.email:
            recipients.append(ticket.assignee)
        
        # Tekrarlananları kaldır
        unique_recipients = {}
        for r in recipients:
            unique_recipients[r.id] = r
        
        logger.info(f"Comment notification recipients: {[r.email for r in unique_recipients.values()]}")
        
        for recipient in unique_recipients.values():
            notif_settings = db.query(models.NotificationSettings).filter(
                models.NotificationSettings.user_id == recipient.id
            ).first()
            # Ayar yoksa varsayılan: gönder. Varsa email_notifications ve ticket_commented ikisi de True olmalı.
            allowed = False
            if notif_settings is None:
                allowed = True
            elif notif_settings.email_notifications and notif_settings.ticket_commented:
                allowed = True
            logger.info(f"Comment notification check for {recipient.email}: allowed={allowed}, settings={notif_settings}")
            if allowed:
                try:
                    background_tasks.add_task(send_comment_notification_email, db, ticket, new_comment_full, current_user, recipient)
                except Exception as e:
                    logger.error(f"Comment notification email task hatası: {str(e)}")
    except Exception as e:
        logger.error(f"Comment notification process hatası: {str(e)}")
    
    # Response'u manuel döndür (validation hatasını engellemek için)
    return {
        "id": new_comment_full.id,
        "content": new_comment_full.content,
        "created_at": new_comment_full.created_at,
        "user_id": new_comment_full.user_id,
        "ticket_id": new_comment_full.ticket_id,
        "user": {
            "id": new_comment_full.user.id if new_comment_full.user else None,
            "username": new_comment_full.user.username if new_comment_full.user else None,
            "full_name": new_comment_full.user.full_name if new_comment_full.user else None,
            "email": new_comment_full.user.email if new_comment_full.user else None
        } if new_comment_full.user else None
    }

@router.get("/{ticket_id}/attachments/")
def get_ticket_attachments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Ticket'ın eklerini getir"""
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    # Attachments tablosundan bu ticket'ın eklerini getir
    attachments = db.query(models.Attachment).filter(models.Attachment.ticket_id == ticket_id).all()
    
    # Response'ı manuel oluştur ve file_type ekle
    result = []
    for attachment in attachments:
        # Dosya uzantısından type'ı belirle
        filename_lower = attachment.filename.lower()
        is_image = filename_lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif'))
        is_pdf = filename_lower.endswith(('.pdf',))
        
        preview_url = None
        if is_image or is_pdf:
            preview_url = f"/api/tickets/{ticket_id}/attachments/{attachment.id}/preview"
        
        result.append({
            "id": attachment.id,
            "ticket_id": attachment.ticket_id,
            "filename": attachment.filename,
            "file_size": attachment.file_size,
            "size_formatted": f"{attachment.file_size / 1024:.1f} KB" if attachment.file_size else "0 KB",
            "uploaded_at": attachment.created_at.strftime("%d.%m.%Y %H:%M:%S") if attachment.created_at else "",
            "file_type": "image" if is_image else "document",
            "preview_url": preview_url,
            "download_url": f"/api/tickets/{ticket_id}/attachments/{attachment.id}/download"
        })
    
    return result

@router.get("/{ticket_id}/shared_users/")
def get_ticket_shared_users(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Ticket'ın paylaşıldığı kullanıcıları getir"""
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    # Şimdilik boş liste döndür, daha sonra shared_with_users relation'ı eklenecek
    return []

@router.get("/{ticket_id}/shared_departments/")
def get_ticket_shared_departments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Ticket'ın paylaşıldığı departmanları getir"""
    if not can_access_ticket(db, current_user, ticket_id):
        raise HTTPException(status_code=403, detail="Bu destek talebine erişim yetkiniz yok")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    
    # Şimdilik boş liste döndür, daha sonra shared_with_departments relation'ı eklenecek
    return []
