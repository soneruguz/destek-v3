import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models

logger = logging.getLogger("uvicorn")

# Uygulama başlangıç zamanı - restart sonrası ilk döngüde eski talepleri tekrar escalate etmemek için
_worker_start_time = None

# Maksimum escalation sayısı - sonsuz döngüyü önlemek için
MAX_ESCALATION_COUNT = 3

async def run_auto_escalation():
    """Periyodik olarak bekleyen talepleri kontrol eder ve gecikenleri yönlendirir"""
    global _worker_start_time
    _worker_start_time = datetime.utcnow()
    
    # İlk çalışmada bekleme süresi: restart sonrası hemen mail yağdırmamak için
    # İlk kontrolden önce 2 dakika bekle (diğer guard'lar zaten koruma sağlıyor)
    logger.info("Escalation worker başlatıldı, ilk kontrol 2 dakika sonra yapılacak...")
    await asyncio.sleep(120)
    
    while True:
        try:
            logger.info("Otomatik atama (escalation) kontrolü başlatılıyor...")
            db = SessionLocal()
            try:
                # 1. Konfigürasyonu al
                config = db.query(models.GeneralConfig).first()
                if not config or not config.workflow_enabled or not config.escalation_enabled:
                    await asyncio.sleep(300)
                    continue
                
                # Escalation hedefi yoksa devam etme
                if not config.escalation_target_user_id and not config.escalation_target_department_id:
                    logger.warning("Escalation aktif ancak hedef (user/dept) belirtilmemiş")
                    await asyncio.sleep(300)
                    continue

                # 2. Açık ve henüz çözülmemiş talepleri al
                open_tickets = db.query(models.Ticket).filter(
                    models.Ticket.status == "open"
                ).all()

                for ticket in open_tickets:
                    # === GUARD 1: Zaten hedef kullanıcı/departmana atanmış mı? ===
                    # Eğer talep zaten escalation hedefine atanmışsa tekrar escalate etme
                    if config.escalation_target_user_id and ticket.assignee_id == config.escalation_target_user_id:
                        continue
                    if config.escalation_target_department_id and not config.escalation_target_user_id:
                        if ticket.department_id == config.escalation_target_department_id and ticket.assignee_id is None:
                            continue
                    
                    # === GUARD 2: Maksimum escalation sayısına ulaşılmış mı? ===
                    if ticket.escalation_count >= MAX_ESCALATION_COUNT:
                        continue
                    
                    # Zaman aşımı süresini belirle
                    timeout_mins = config.timeout_medium # Default
                    if ticket.priority == "critical":
                        timeout_mins = config.timeout_critical
                    elif ticket.priority == "high":
                        timeout_mins = config.timeout_high
                    elif ticket.priority == "medium":
                        timeout_mins = config.timeout_medium
                    elif ticket.priority == "low":
                        timeout_mins = config.timeout_low
                    
                    # Geçen süreyi hesapla (oluşturulma veya son escalation üzerinden)
                    base_time = ticket.last_escalation_at or ticket.created_at
                    elapsed = datetime.utcnow() - base_time
                    
                    # === GUARD 3: Backlog Guard ===
                    # Eğer talep hiç escalate edilmemişse ve oluşturulma tarihi 24 saatten eskiyse es geç
                    if ticket.last_escalation_at is None and (datetime.utcnow() - ticket.created_at) > timedelta(hours=24):
                        continue

                    # === GUARD 4: Restart Guard ===
                    # Worker başladıktan sonra oluşan timeout'ları kontrol et
                    # Eğer talep worker başlamadan önce zaten timeout olmuşsa ve daha önce escalate edilmişse,
                    # bu restart kaynaklı tekrar escalation'dır - atla
                    if ticket.last_escalation_at and _worker_start_time:
                        if ticket.last_escalation_at < _worker_start_time:
                            # Son escalation restart'tan önce yapılmış
                            # Timeout süresi restart'tan önce mi dolmuş kontrol et
                            timeout_deadline = ticket.last_escalation_at + timedelta(minutes=timeout_mins)
                            if timeout_deadline < _worker_start_time:
                                # Timeout restart'tan önce dolmuş ama kimse müdahale etmemiş
                                # Bu durumda tekrar mail göndermek anlamsız - zaten bir kere gönderilmiş
                                logger.debug(f"Ticket #{ticket.id} restart öncesi zaten escalate edilmiş, tekrar yapılmıyor.")
                                continue

                    if elapsed > timedelta(minutes=timeout_mins):
                        # === GUARD 5: Son escalation'dan bu yana yeterli süre geçmiş mi? ===
                        # Aynı timeout periyodunda tekrar escalate etme
                        if ticket.last_escalation_at and (datetime.utcnow() - ticket.last_escalation_at) < timedelta(minutes=timeout_mins):
                            logger.debug(f"Ticket #{ticket.id} henüz timeout periyodu dolmadı, tekrar yapılmıyor.")
                            continue
                        
                        logger.info(f"Ticket #{ticket.id} zaman aşımına uğradı ({elapsed}). Yeniden yönlendiriliyor...")
                        
                        # 3. Yeniden yönlendir
                        if config.escalation_target_user_id:
                            ticket.assignee_id = config.escalation_target_user_id
                            logger.info(f"Ticket #{ticket.id} -> User {ticket.assignee_id} (Escalated)")
                        elif config.escalation_target_department_id:
                            ticket.department_id = config.escalation_target_department_id
                            ticket.assignee_id = None
                            logger.info(f"Ticket #{ticket.id} -> Dept {ticket.department_id} (Escalated)")
                        
                        ticket.last_escalation_at = datetime.utcnow()
                        ticket.escalation_count += 1
                        
                        db.commit()
                        
                        # Bildirim gönder - escalation için 'update' context kullan
                        try:
                            from utils.notifications import notify_users_about_ticket
                            import schemas
                            asyncio.create_task(notify_users_about_ticket(
                                db,
                                None,
                                ticket.id,
                                schemas.NotificationTypeEnum.TICKET_ASSIGNED,
                                f"Otomatik Atama: {ticket.title}",
                                f"Bu talep zaman aşımı nedeniyle otomatik olarak{' size' if config.escalation_target_user_id else ' biriminize'} atandı.",
                                None,
                                'update'
                            ))
                        except Exception as ne:
                            logger.error(f"Escalation bildirimi gönderilirken hata: {str(ne)}")
                        
                db.commit()
            except Exception as e:
                logger.error(f"Escalation döngüsünde hata: {str(e)}")
                db.rollback()
            finally:
                db.close()
            
            # Her 5 dakikada bir kontrol et
            await asyncio.sleep(300)
                
        except Exception as e:
            logger.error(f"Global escalation worker hatası: {str(e)}")
            await asyncio.sleep(60) # Hata durumunda biraz bekle
