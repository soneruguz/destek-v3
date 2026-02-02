"""
External API Router - Harici Uygulamalar için API Entegrasyonu

Bu modül, harici uygulamaların (ERP, CRM, vb.) destek sistemi ile entegre olmasını sağlar.
API anahtarı ile kimlik doğrulama yapılır ve webhook mekanizması ile olaylar bildirilir.

Kullanım:
1. Admin panelden API Client oluşturun ve API Key/Secret alın
2. Webhook URL'lerinizi tanımlayın
3. API isteklerinde X-API-Key ve X-API-Secret header'larını kullanın

Örnek İstek:
    curl -X POST https://api.example.com/api/external/tickets \
         -H "X-API-Key: your-api-key" \
         -H "X-API-Secret: your-api-secret" \
         -H "Content-Type: application/json" \
         -d '{"title": "Test", "description": "Test açıklama", "priority": "medium"}'
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import secrets
import hashlib
import json
import logging

from database import get_db
import models, schemas

logger = logging.getLogger(__name__)

router = APIRouter(tags=["external-api"])


# ==================== API KEY AUTHENTICATION ====================

def hash_secret(secret: str) -> str:
    """API secret'ını hash'le"""
    return hashlib.sha256(secret.encode()).hexdigest()


def generate_api_key() -> str:
    """32 karakterlik benzersiz API key oluştur"""
    return secrets.token_hex(16)


def generate_api_secret() -> str:
    """64 karakterlik benzersiz API secret oluştur"""
    return secrets.token_hex(32)


async def verify_api_key(
    x_api_key: str = Header(..., description="API Anahtarı"),
    x_api_secret: str = Header(..., description="API Gizli Anahtarı"),
    db: Session = Depends(get_db)
) -> models.ApiClient:
    """API anahtarı ve secret doğrulama"""
    
    # API Client'ı bul
    api_client = db.query(models.ApiClient).filter(
        models.ApiClient.api_key == x_api_key,
        models.ApiClient.is_active == True
    ).first()
    
    if not api_client:
        logger.warning(f"Invalid API key attempt: {x_api_key[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya devre dışı API anahtarı"
        )
    
    # Secret doğrula
    if api_client.api_secret != hash_secret(x_api_secret):
        logger.warning(f"Invalid API secret for client: {api_client.name}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz API gizli anahtarı"
        )
    
    # Son kullanım zamanını güncelle
    api_client.last_used_at = datetime.utcnow()
    db.commit()
    
    return api_client


def check_permission(api_client: models.ApiClient, permission: str) -> bool:
    """API client izinlerini kontrol et"""
    permissions = {
        "create_tickets": api_client.can_create_tickets,
        "read_tickets": api_client.can_read_tickets,
        "update_tickets": api_client.can_update_tickets,
        "add_comments": api_client.can_add_comments
    }
    return permissions.get(permission, False)


def check_department_access(api_client: models.ApiClient, department_id: int) -> bool:
    """API client'ın departmana erişimi var mı kontrol et"""
    if not api_client.allowed_departments:
        return True  # Kısıtlama yok, tüm departmanlara erişebilir
    
    try:
        allowed = json.loads(api_client.allowed_departments)
        return department_id in allowed
    except:
        return True


# ==================== TICKET ENDPOINTS ====================

@router.post("/tickets", response_model=schemas.ExternalTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket_external(
    ticket_data: schemas.ExternalTicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_client: models.ApiClient = Depends(verify_api_key)
):
    """
    Harici API'den yeni talep oluştur
    
    - Talebin kaynağı 'api' olarak işaretlenir
    - Mevcut iş akışı (triage, otomatik atama vb.) aynen uygulanır
    - Webhook ile ilgili uygulamaya bildirim gönderilir
    """
    
    # İzin kontrolü
    if not check_permission(api_client, "create_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu API anahtarı talep oluşturma iznine sahip değil"
        )
    
    # Departman belirleme
    department_id = ticket_data.department_id or api_client.default_department_id
    if not department_id:
        # Varsayılan sistem departmanını al
        config = db.query(models.GeneralConfig).first()
        department_id = config.default_department_id if config else None
    
    if not department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Departman ID belirtilmeli veya varsayılan departman tanımlanmalı"
        )
    
    # Departman erişim kontrolü
    if not check_department_access(api_client, department_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu departmana talep açma yetkiniz yok"
        )
    
    # Departman varlık kontrolü
    department = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Departman bulunamadı")
    
    # Sistem ayarlarını al (triage, manager assignment vb.)
    config = db.query(models.GeneralConfig).first()
    
    # Varsayılan creator olarak API client'ın contact_user'ı veya sistem kullanıcısı
    creator_id = api_client.contact_user_id
    if not creator_id:
        # Sistem admin kullanıcısını bul
        admin_user = db.query(models.User).filter(models.User.is_admin == True).first()
        creator_id = admin_user.id if admin_user else 1
    
    # Atama mantığı (mevcut sistemle aynı)
    assignee_id = None
    
    if config and config.workflow_enabled:
        if config.triage_user_id:
            assignee_id = config.triage_user_id
        elif config.triage_department_id:
            department_id = config.triage_department_id
    elif config and config.require_manager_assignment and department.manager_id:
        assignee_id = department.manager_id
    
    try:
        import pytz
        istanbul_tz = pytz.timezone('Europe/Istanbul')
        now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
        
        # Ticket oluştur
        new_ticket = models.Ticket(
            title=ticket_data.title,
            description=ticket_data.description,
            status="open",
            priority=ticket_data.priority,
            source="api",  # Kaynak: API
            external_ref=ticket_data.external_ref,
            api_client_id=api_client.id,
            creator_id=creator_id,
            department_id=department_id,
            assignee_id=assignee_id,
            is_private=ticket_data.is_private,
            created_at=now_istanbul
        )
        
        # TEOS ID ve vatandaşlık no varsa ekle
        if hasattr(ticket_data, 'teos_id') and ticket_data.teos_id:
            new_ticket.teos_id = ticket_data.teos_id
        if hasattr(ticket_data, 'citizenship_no') and ticket_data.citizenship_no:
            new_ticket.citizenship_no = ticket_data.citizenship_no
        
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        
        # İlişkileri yükle
        created_ticket = db.query(models.Ticket).options(
            joinedload(models.Ticket.department),
            joinedload(models.Ticket.assignee),
            joinedload(models.Ticket.creator)
        ).filter(models.Ticket.id == new_ticket.id).first()
        
        logger.info(f"External API ticket created: #{created_ticket.id} by {api_client.name}")
        
        # Webhook gönder
        background_tasks.add_task(
            send_webhook,
            db=None,  # Arka planda yeni session açılacak
            api_client_id=api_client.id,
            event_type="ticket.created",
            ticket=created_ticket
        )
        
        # Sistem bildirimleri gönder (mevcut sistemle aynı)
        from utils.notifications import notify_users_about_ticket
        title = f"Yeni Talep (API): {created_ticket.title}"
        message = f"Harici sistem ({api_client.name}) tarafından yeni bir talep oluşturuldu."
        
        background_tasks.add_task(
            notify_users_about_ticket,
            None,
            background_tasks,
            created_ticket.id,
            schemas.NotificationTypeEnum.TICKET_CREATED,
            title,
            message,
            creator_id,
            'creation'
        )
        
        return schemas.ExternalTicketResponse.from_ticket(created_ticket)
        
    except Exception as e:
        logger.error(f"External API ticket creation error: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Talep oluşturulurken hata: {str(e)}")


@router.get("/tickets", response_model=schemas.ExternalTicketListResponse)
async def list_tickets_external(
    status: Optional[str] = Query(None, description="Durum filtresi (open, in_progress, resolved, closed)"),
    external_ref: Optional[str] = Query(None, description="Harici referans numarası ile ara"),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    per_page: int = Query(20, ge=1, le=100, description="Sayfa başına kayıt"),
    db: Session = Depends(get_db),
    api_client: models.ApiClient = Depends(verify_api_key)
):
    """
    Bu API client tarafından oluşturulan talepleri listele
    
    - Sadece bu API client'ın oluşturduğu talepler döner
    - Sayfalama desteklenir
    - Durum ve external_ref ile filtreleme yapılabilir
    """
    
    if not check_permission(api_client, "read_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu API anahtarı talep okuma iznine sahip değil"
        )
    
    # Sadece bu API client'ın taleplerini getir
    query = db.query(models.Ticket).filter(
        models.Ticket.api_client_id == api_client.id
    )
    
    # Filtreler
    if status:
        query = query.filter(models.Ticket.status == status)
    if external_ref:
        query = query.filter(models.Ticket.external_ref == external_ref)
    
    # Toplam sayı
    total = query.count()
    
    # Sayfalama
    offset = (page - 1) * per_page
    tickets = query.options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).order_by(models.Ticket.created_at.desc()).offset(offset).limit(per_page).all()
    
    # Yorum ve ek sayılarını al
    ticket_responses = []
    for ticket in tickets:
        comments_count = db.query(func.count(models.Comment.id)).filter(
            models.Comment.ticket_id == ticket.id
        ).scalar()
        attachments_count = db.query(func.count(models.Attachment.id)).filter(
            models.Attachment.ticket_id == ticket.id
        ).scalar()
        ticket_responses.append(
            schemas.ExternalTicketResponse.from_ticket(ticket, comments_count, attachments_count)
        )
    
    pages = (total + per_page - 1) // per_page
    
    return schemas.ExternalTicketListResponse(
        tickets=ticket_responses,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )


@router.get("/tickets/{ticket_id}", response_model=schemas.ExternalTicketResponse)
async def get_ticket_external(
    ticket_id: int,
    db: Session = Depends(get_db),
    api_client: models.ApiClient = Depends(verify_api_key)
):
    """
    Talep detayını getir
    
    - Sadece bu API client'ın oluşturduğu talepler görüntülenebilir
    """
    
    if not check_permission(api_client, "read_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu API anahtarı talep okuma iznine sahip değil"
        )
    
    ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.api_client_id == api_client.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Talep bulunamadı veya erişim yetkiniz yok")
    
    comments_count = db.query(func.count(models.Comment.id)).filter(
        models.Comment.ticket_id == ticket.id
    ).scalar()
    attachments_count = db.query(func.count(models.Attachment.id)).filter(
        models.Attachment.ticket_id == ticket.id
    ).scalar()
    
    return schemas.ExternalTicketResponse.from_ticket(ticket, comments_count, attachments_count)


@router.get("/tickets/by-ref/{external_ref}", response_model=schemas.ExternalTicketResponse)
async def get_ticket_by_external_ref(
    external_ref: str,
    db: Session = Depends(get_db),
    api_client: models.ApiClient = Depends(verify_api_key)
):
    """
    Harici referans numarası ile talep getir
    
    - Kendi sisteminizdeki referans numarası ile sorgu yapabilirsiniz
    """
    
    if not check_permission(api_client, "read_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu API anahtarı talep okuma iznine sahip değil"
        )
    
    ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(
        models.Ticket.external_ref == external_ref,
        models.Ticket.api_client_id == api_client.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    
    comments_count = db.query(func.count(models.Comment.id)).filter(
        models.Comment.ticket_id == ticket.id
    ).scalar()
    attachments_count = db.query(func.count(models.Attachment.id)).filter(
        models.Attachment.ticket_id == ticket.id
    ).scalar()
    
    return schemas.ExternalTicketResponse.from_ticket(ticket, comments_count, attachments_count)


@router.get("/tickets/{ticket_id}/comments", response_model=List[schemas.ExternalCommentResponse])
async def get_ticket_comments_external(
    ticket_id: int,
    db: Session = Depends(get_db),
    api_client: models.ApiClient = Depends(verify_api_key)
):
    """Talepteki yorumları getir"""
    
    if not check_permission(api_client, "read_tickets"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu API anahtarı talep okuma iznine sahip değil"
        )
    
    # Erişim kontrolü
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.api_client_id == api_client.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Talep bulunamadı veya erişim yetkiniz yok")
    
    comments = db.query(models.Comment).options(
        joinedload(models.Comment.user)
    ).filter(
        models.Comment.ticket_id == ticket_id
    ).order_by(models.Comment.created_at.asc()).all()
    
    return [
        schemas.ExternalCommentResponse(
            id=c.id,
            content=c.content,
            user_id=c.user_id,
            user_name=c.user.full_name if c.user else None,
            created_at=c.created_at
        ) for c in comments
    ]


@router.post("/tickets/{ticket_id}/comments", response_model=schemas.ExternalCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment_external(
    ticket_id: int,
    comment_data: schemas.ExternalCommentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_client: models.ApiClient = Depends(verify_api_key)
):
    """Talebe yorum ekle"""
    
    if not check_permission(api_client, "add_comments"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu API anahtarı yorum ekleme iznine sahip değil"
        )
    
    # Erişim kontrolü
    ticket = db.query(models.Ticket).options(
        joinedload(models.Ticket.department),
        joinedload(models.Ticket.assignee)
    ).filter(
        models.Ticket.id == ticket_id,
        models.Ticket.api_client_id == api_client.id
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Talep bulunamadı veya erişim yetkiniz yok")
    
    # Yorum ekleyecek kullanıcı
    user_id = api_client.contact_user_id
    if not user_id:
        admin_user = db.query(models.User).filter(models.User.is_admin == True).first()
        user_id = admin_user.id if admin_user else 1
    
    import pytz
    istanbul_tz = pytz.timezone('Europe/Istanbul')
    now_istanbul = datetime.now(istanbul_tz).replace(tzinfo=None)
    
    new_comment = models.Comment(
        content=f"[API - {api_client.name}] {comment_data.content}",
        user_id=user_id,
        ticket_id=ticket_id,
        created_at=now_istanbul
    )
    
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    logger.info(f"External API comment added to ticket #{ticket_id} by {api_client.name}")
    
    # Webhook gönder
    background_tasks.add_task(
        send_webhook,
        db=None,
        api_client_id=api_client.id,
        event_type="comment.added",
        ticket=ticket,
        comment=new_comment
    )
    
    return schemas.ExternalCommentResponse(
        id=new_comment.id,
        content=new_comment.content,
        user_id=new_comment.user_id,
        user_name=user.full_name if user else None,
        created_at=new_comment.created_at
    )


# ==================== WEBHOOK SERVICE ====================

async def send_webhook(
    db: Session,
    api_client_id: int,
    event_type: str,
    ticket: models.Ticket,
    comment: models.Comment = None,
    changes: dict = None
):
    """Webhook'ları tetikle ve gönder"""
    import httpx
    import asyncio
    
    # Yeni DB session oluştur
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        # İlgili webhook'ları bul
        webhooks = db.query(models.Webhook).filter(
            models.Webhook.api_client_id == api_client_id,
            models.Webhook.is_active == True
        ).all()
        
        for webhook in webhooks:
            # Event tipini kontrol et
            try:
                events = json.loads(webhook.events) if isinstance(webhook.events, str) else webhook.events
            except:
                events = []
            
            if event_type not in events:
                continue
            
            # Payload oluştur
            payload = {
                "event": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "ticket_id": ticket.id,
                "ticket": {
                    "id": ticket.id,
                    "title": ticket.title,
                    "description": ticket.description,
                    "status": ticket.status,
                    "priority": ticket.priority,
                    "source": getattr(ticket, 'source', 'api'),
                    "external_ref": getattr(ticket, 'external_ref', None),
                    "department_id": ticket.department_id,
                    "department_name": ticket.department.name if ticket.department else None,
                    "assignee_id": ticket.assignee_id,
                    "assignee_name": ticket.assignee.full_name if ticket.assignee else None,
                    "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
                    "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None
                }
            }
            
            if changes:
                payload["changes"] = changes
            
            if comment:
                payload["comment"] = {
                    "id": comment.id,
                    "content": comment.content,
                    "user_id": comment.user_id,
                    "created_at": comment.created_at.isoformat() if comment.created_at else None
                }
            
            # İmza oluştur
            headers = {"Content-Type": "application/json"}
            if webhook.secret:
                import hmac
                signature = hmac.new(
                    webhook.secret.encode(),
                    json.dumps(payload).encode(),
                    hashlib.sha256
                ).hexdigest()
                headers["X-Webhook-Signature"] = signature
            
            # Webhook'u gönder
            success = False
            response_status = None
            response_body = None
            error_message = None
            
            for retry in range(webhook.max_retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.post(
                            webhook.url,
                            json=payload,
                            headers=headers
                        )
                        response_status = response.status_code
                        response_body = response.text[:1000]  # İlk 1000 karakter
                        
                        if response.status_code >= 200 and response.status_code < 300:
                            success = True
                            break
                        else:
                            error_message = f"HTTP {response.status_code}: {response_body}"
                            
                except Exception as e:
                    error_message = str(e)
                
                if retry < webhook.max_retries:
                    await asyncio.sleep(webhook.retry_delay_seconds)
            
            # Log kaydet
            webhook_log = models.WebhookLog(
                webhook_id=webhook.id,
                event_type=event_type,
                payload=json.dumps(payload),
                response_status=response_status,
                response_body=response_body,
                success=success,
                error_message=error_message,
                retry_count=retry
            )
            db.add(webhook_log)
            
            # Webhook durumunu güncelle
            webhook.last_triggered_at = datetime.utcnow()
            if success:
                webhook.last_success_at = datetime.utcnow()
                webhook.failure_count = 0
            else:
                webhook.last_failure_at = datetime.utcnow()
                webhook.failure_count += 1
            
            db.commit()
            
            if success:
                logger.info(f"Webhook sent successfully: {webhook.url} for event {event_type}")
            else:
                logger.error(f"Webhook failed: {webhook.url} - {error_message}")
                
    except Exception as e:
        logger.error(f"Webhook service error: {str(e)}")
    finally:
        db.close()


# ==================== DURUM DEĞİŞİKLİĞİ HOOK ====================

def trigger_ticket_webhook(
    db: Session,
    ticket: models.Ticket,
    event_type: str,
    changes: dict = None,
    comment: models.Comment = None
):
    """
    Ticket değişikliklerinde webhook tetikle
    
    Bu fonksiyon mevcut ticket endpoint'lerinden çağrılmalı:
    - Durum değişikliğinde: trigger_ticket_webhook(db, ticket, "ticket.status_changed", {"old_status": "open", "new_status": "closed"})
    - Atama değişikliğinde: trigger_ticket_webhook(db, ticket, "ticket.assigned", {"assignee_id": 5})
    """
    import asyncio
    
    if not ticket.api_client_id:
        return  # API'den açılmamış ticket, webhook yok
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    loop.create_task(send_webhook(
        db=None,
        api_client_id=ticket.api_client_id,
        event_type=event_type,
        ticket=ticket,
        comment=comment,
        changes=changes
    ))
