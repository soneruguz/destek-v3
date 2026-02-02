import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models

logger = logging.getLogger("uvicorn")

async def run_auto_escalation():
    """Periyodik olarak bekleyen talepleri kontrol eder ve gecikenleri yönlendirir"""
    while True:
        try:
            # Her 5 dakikada bir kontrol et
            await asyncio.sleep(300) 
            
            logger.info("Otomatik atama (escalation) kontrolü başlatılıyor...")
            db = SessionLocal()
            try:
                # 1. Konfigürasyonu al
                config = db.query(models.GeneralConfig).first()
                if not config or not config.workflow_enabled or not config.escalation_enabled:
                    continue
                
                # Escalation hedefi yoksa devam etme
                if not config.escalation_target_user_id and not config.escalation_target_department_id:
                    logger.warning("Escalation aktif ancak hedef (user/dept) belirtilmemiş")
                    continue

                # 2. Açık ve henüz çözülmemiş talepleri al
                # Sadece 'open' durumundakiler veya atanmış ama işlem görmeyenler (isteğe bağlı)
                # Burada sadece 'open' olanları kontrol ediyoruz.
                open_tickets = db.query(models.Ticket).filter(
                    models.Ticket.status == "open"
                ).all()

                for ticket in open_tickets:
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
                    
                    # ÖNEMLİ: Geçmişteki tüm taleplerin bir anda atamasını engelle (Backlog Guard)
                    # Eğer talep hiç escalate edilmemişse ve oluşturulma tarihi 24 saatten eskiyse es geç
                    if ticket.last_escalation_at is None and (datetime.utcnow() - ticket.created_at) > timedelta(hours=24):
                        # logger.debug(f"Ticket #{ticket.id} çok eski (24s+), otomatik atama yapılmadı.")
                        continue

                    if elapsed > timedelta(minutes=timeout_mins):
                        logger.info(f"Ticket #{ticket.id} zaman aşımına uğradı ({elapsed}). Yeniden yönlendiriliyor...")
                        
                        # Eğer son 10 dakika içinde escalation yapılmışsa tekrar yapma (loop önleme)
                        if ticket.last_escalation_at and (datetime.utcnow() - ticket.last_escalation_at) < timedelta(minutes=10):
                            logger.debug(f"Ticket #{ticket.id} çok yakın zamanda escalate edilmiş, tekrar yapılmıyor.")
                            continue
                        
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
                        
                        # Log/Comment ekle (isteğe bağlı)
                        db.commit() # Her birini tek tek commit etmek daha güvenli olabilir
                        
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
                                'update'  # Context ekledik - update template'ini kullanacak
                            ))
                        except Exception as ne:
                            logger.error(f"Escalation bildirimi gönderilirken hata: {str(ne)}")
                        
                db.commit()
            except Exception as e:
                logger.error(f"Escalation döngüsünde hata: {str(e)}")
                db.rollback()
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Global escalation worker hatası: {str(e)}")
            await asyncio.sleep(60) # Hata durumunda biraz bekle
