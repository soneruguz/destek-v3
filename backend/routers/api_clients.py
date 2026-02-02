"""
API Client Management - Admin Endpoint'leri

Bu modül, sistem yöneticilerinin API client'larını ve webhook'ları yönetmesini sağlar.
Sadece admin yetkisine sahip kullanıcılar erişebilir.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import json
import logging

from database import get_db
import models, schemas
from auth import get_current_active_user
from routers.external_api import generate_api_key, generate_api_secret, hash_secret

logger = logging.getLogger(__name__)

router = APIRouter(tags=["api-clients"])


def require_admin(current_user: models.User = Depends(get_current_active_user)):
    """Admin yetkisi gerektirir"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yönetici yetkisi gerekli"
        )
    return current_user


# ==================== API CLIENT MANAGEMENT ====================

@router.get("/", response_model=List[schemas.ApiClientResponse])
async def list_api_clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Tüm API client'ları listele"""
    clients = db.query(models.ApiClient).order_by(models.ApiClient.created_at.desc()).all()
    return clients


@router.post("/", response_model=schemas.ApiClientWithSecret, status_code=status.HTTP_201_CREATED)
async def create_api_client(
    client_data: schemas.ApiClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """
    Yeni API client oluştur
    
    ⚠️ DİKKAT: api_secret sadece bu yanıtta gösterilir, saklamayı unutmayın!
    """
    
    # Benzersiz key ve secret oluştur
    api_key = generate_api_key()
    api_secret = generate_api_secret()
    
    # Allowed departments JSON'a çevir
    allowed_departments = None
    if client_data.allowed_departments:
        allowed_departments = json.dumps(client_data.allowed_departments)
    
    new_client = models.ApiClient(
        name=client_data.name,
        description=client_data.description,
        api_key=api_key,
        api_secret=hash_secret(api_secret),  # Hash'lenmiş olarak sakla
        can_create_tickets=client_data.can_create_tickets,
        can_read_tickets=client_data.can_read_tickets,
        can_update_tickets=client_data.can_update_tickets,
        can_add_comments=client_data.can_add_comments,
        allowed_departments=allowed_departments,
        rate_limit_per_minute=client_data.rate_limit_per_minute,
        default_department_id=client_data.default_department_id,
        contact_user_id=client_data.contact_user_id
    )
    
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
    logger.info(f"API Client created: {new_client.name} by {current_user.username}")
    
    # Yanıtta plain secret'ı göster (sadece bu sefer)
    response = schemas.ApiClientWithSecret(
        id=new_client.id,
        name=new_client.name,
        description=new_client.description,
        api_key=new_client.api_key,
        api_secret=api_secret,  # Plain text - SADECE BU SEFER
        is_active=new_client.is_active,
        can_create_tickets=new_client.can_create_tickets,
        can_read_tickets=new_client.can_read_tickets,
        can_update_tickets=new_client.can_update_tickets,
        can_add_comments=new_client.can_add_comments,
        allowed_departments=client_data.allowed_departments,
        rate_limit_per_minute=new_client.rate_limit_per_minute,
        default_department_id=new_client.default_department_id,
        contact_user_id=new_client.contact_user_id,
        created_at=new_client.created_at,
        updated_at=new_client.updated_at,
        last_used_at=new_client.last_used_at
    )
    
    return response


@router.get("/{client_id}", response_model=schemas.ApiClientResponse)
async def get_api_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """API client detayını getir"""
    client = db.query(models.ApiClient).filter(models.ApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="API Client bulunamadı")
    return client


@router.put("/{client_id}", response_model=schemas.ApiClientResponse)
async def update_api_client(
    client_id: int,
    client_data: schemas.ApiClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """API client güncelle"""
    client = db.query(models.ApiClient).filter(models.ApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="API Client bulunamadı")
    
    update_data = client_data.dict(exclude_unset=True)
    
    # Allowed departments JSON'a çevir
    if 'allowed_departments' in update_data:
        if update_data['allowed_departments']:
            update_data['allowed_departments'] = json.dumps(update_data['allowed_departments'])
        else:
            update_data['allowed_departments'] = None
    
    for key, value in update_data.items():
        setattr(client, key, value)
    
    client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(client)
    
    logger.info(f"API Client updated: {client.name} by {current_user.username}")
    
    return client


@router.delete("/{client_id}")
async def delete_api_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """API client sil"""
    client = db.query(models.ApiClient).filter(models.ApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="API Client bulunamadı")
    
    client_name = client.name
    db.delete(client)
    db.commit()
    
    logger.info(f"API Client deleted: {client_name} by {current_user.username}")
    
    return {"message": f"API Client '{client_name}' silindi"}


@router.post("/{client_id}/regenerate-secret", response_model=schemas.ApiClientWithSecret)
async def regenerate_api_secret(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """
    API secret'ı yeniden oluştur
    
    ⚠️ DİKKAT: Eski secret geçersiz olacak, yeni secret'ı saklamayı unutmayın!
    """
    client = db.query(models.ApiClient).filter(models.ApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="API Client bulunamadı")
    
    new_secret = generate_api_secret()
    client.api_secret = hash_secret(new_secret)
    client.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(client)
    
    logger.info(f"API Secret regenerated for: {client.name} by {current_user.username}")
    
    # Yanıtta yeni secret'ı göster
    return schemas.ApiClientWithSecret(
        id=client.id,
        name=client.name,
        description=client.description,
        api_key=client.api_key,
        api_secret=new_secret,  # Plain text - SADECE BU SEFER
        is_active=client.is_active,
        can_create_tickets=client.can_create_tickets,
        can_read_tickets=client.can_read_tickets,
        can_update_tickets=client.can_update_tickets,
        can_add_comments=client.can_add_comments,
        allowed_departments=json.loads(client.allowed_departments) if client.allowed_departments else None,
        rate_limit_per_minute=client.rate_limit_per_minute,
        default_department_id=client.default_department_id,
        contact_user_id=client.contact_user_id,
        created_at=client.created_at,
        updated_at=client.updated_at,
        last_used_at=client.last_used_at
    )


# ==================== WEBHOOK MANAGEMENT ====================

@router.get("/{client_id}/webhooks", response_model=List[schemas.WebhookResponse])
async def list_webhooks(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """API client'ın webhook'larını listele"""
    client = db.query(models.ApiClient).filter(models.ApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="API Client bulunamadı")
    
    webhooks = db.query(models.Webhook).filter(
        models.Webhook.api_client_id == client_id
    ).order_by(models.Webhook.created_at.desc()).all()
    
    # Events JSON'dan listeye çevir
    result = []
    for wh in webhooks:
        wh_dict = {
            "id": wh.id,
            "api_client_id": wh.api_client_id,
            "url": wh.url,
            "events": json.loads(wh.events) if isinstance(wh.events, str) else wh.events,
            "is_active": wh.is_active,
            "max_retries": wh.max_retries,
            "retry_delay_seconds": wh.retry_delay_seconds,
            "last_triggered_at": wh.last_triggered_at,
            "last_success_at": wh.last_success_at,
            "last_failure_at": wh.last_failure_at,
            "failure_count": wh.failure_count,
            "created_at": wh.created_at
        }
        result.append(schemas.WebhookResponse(**wh_dict))
    
    return result


@router.post("/{client_id}/webhooks", response_model=schemas.WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    client_id: int,
    webhook_data: schemas.WebhookCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Yeni webhook oluştur"""
    client = db.query(models.ApiClient).filter(models.ApiClient.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="API Client bulunamadı")
    
    # Events listeyi JSON'a çevir
    events_json = json.dumps([e.value for e in webhook_data.events])
    
    new_webhook = models.Webhook(
        api_client_id=client_id,
        url=webhook_data.url,
        secret=webhook_data.secret,
        events=events_json,
        is_active=webhook_data.is_active,
        max_retries=webhook_data.max_retries,
        retry_delay_seconds=webhook_data.retry_delay_seconds
    )
    
    db.add(new_webhook)
    db.commit()
    db.refresh(new_webhook)
    
    logger.info(f"Webhook created for {client.name}: {new_webhook.url} by {current_user.username}")
    
    return schemas.WebhookResponse(
        id=new_webhook.id,
        api_client_id=new_webhook.api_client_id,
        url=new_webhook.url,
        events=webhook_data.events,
        is_active=new_webhook.is_active,
        max_retries=new_webhook.max_retries,
        retry_delay_seconds=new_webhook.retry_delay_seconds,
        last_triggered_at=new_webhook.last_triggered_at,
        last_success_at=new_webhook.last_success_at,
        last_failure_at=new_webhook.last_failure_at,
        failure_count=new_webhook.failure_count,
        created_at=new_webhook.created_at
    )


@router.put("/{client_id}/webhooks/{webhook_id}", response_model=schemas.WebhookResponse)
async def update_webhook(
    client_id: int,
    webhook_id: int,
    webhook_data: schemas.WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Webhook güncelle"""
    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.api_client_id == client_id
    ).first()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    
    update_data = webhook_data.dict(exclude_unset=True)
    
    # Events listeyi JSON'a çevir
    if 'events' in update_data and update_data['events']:
        update_data['events'] = json.dumps([e.value for e in update_data['events']])
    
    for key, value in update_data.items():
        setattr(webhook, key, value)
    
    webhook.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(webhook)
    
    logger.info(f"Webhook updated: {webhook.url} by {current_user.username}")
    
    events = json.loads(webhook.events) if isinstance(webhook.events, str) else webhook.events
    
    return schemas.WebhookResponse(
        id=webhook.id,
        api_client_id=webhook.api_client_id,
        url=webhook.url,
        events=events,
        is_active=webhook.is_active,
        max_retries=webhook.max_retries,
        retry_delay_seconds=webhook.retry_delay_seconds,
        last_triggered_at=webhook.last_triggered_at,
        last_success_at=webhook.last_success_at,
        last_failure_at=webhook.last_failure_at,
        failure_count=webhook.failure_count,
        created_at=webhook.created_at
    )


@router.delete("/{client_id}/webhooks/{webhook_id}")
async def delete_webhook(
    client_id: int,
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Webhook sil"""
    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.api_client_id == client_id
    ).first()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    
    webhook_url = webhook.url
    db.delete(webhook)
    db.commit()
    
    logger.info(f"Webhook deleted: {webhook_url} by {current_user.username}")
    
    return {"message": f"Webhook '{webhook_url}' silindi"}


@router.get("/{client_id}/webhooks/{webhook_id}/logs", response_model=List[schemas.WebhookLogResponse])
async def get_webhook_logs(
    client_id: int,
    webhook_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Webhook gönderim loglarını getir"""
    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.api_client_id == client_id
    ).first()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    
    logs = db.query(models.WebhookLog).filter(
        models.WebhookLog.webhook_id == webhook_id
    ).order_by(models.WebhookLog.created_at.desc()).limit(limit).all()
    
    return logs


@router.post("/{client_id}/webhooks/{webhook_id}/test")
async def test_webhook(
    client_id: int,
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    """Webhook'u test et"""
    import httpx
    import json as json_module
    import hmac
    import hashlib
    
    webhook = db.query(models.Webhook).filter(
        models.Webhook.id == webhook_id,
        models.Webhook.api_client_id == client_id
    ).first()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook bulunamadı")
    
    # Test payload
    test_payload = {
        "event": "test",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Bu bir test webhook'udur",
        "ticket_id": 0,
        "ticket": {
            "id": 0,
            "title": "Test Talep",
            "description": "Bu bir test talebidir",
            "status": "open",
            "priority": "medium"
        }
    }
    
    headers = {"Content-Type": "application/json"}
    if webhook.secret:
        signature = hmac.new(
            webhook.secret.encode(),
            json_module.dumps(test_payload).encode(),
            hashlib.sha256
        ).hexdigest()
        headers["X-Webhook-Signature"] = signature
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                webhook.url,
                json=test_payload,
                headers=headers
            )
            
            return {
                "success": response.status_code >= 200 and response.status_code < 300,
                "status_code": response.status_code,
                "response": response.text[:500]
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
