import os
import ldap3
from ldap3 import Server, Connection, ALL
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
import sys

from database import get_db, engine
import models

# Loglama yapılandırması
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ldap_sync")

# LDAP ayarları
LDAP_HOST = os.getenv("LDAP_HOST", "tesmer.local")
LDAP_PORT = int(os.getenv("LDAP_PORT", "389"))
LDAP_BASE_DN = os.getenv("LDAP_BASE_DN", "OU=TesmerUser,DC=tesmer,DC=local")
LDAP_BIND_DN = os.getenv("LDAP_BIND_DN", "CN=Ldap reader,OU=TesmerUser,DC=tesmer,DC=local")
LDAP_BIND_PASSWORD = os.getenv("LDAP_BIND_PASSWORD", "S160682u*")

def sync_ldap_users_with_departments():
    """
    LDAP'taki tüm kullanıcıları çeker ve veritabanına ekler, departman bilgilerini güncelleyerek
    """
    logger.info("LDAP kullanıcı senkronizasyon işlemi başlatılıyor...")
    db = next(get_db())
    
    try:
        # LDAP sunucusuna bağlan
        logger.info(f"LDAP sunucusuna bağlanıyor: {LDAP_HOST}:{LDAP_PORT}")
        server = Server(LDAP_HOST, port=LDAP_PORT, get_info=ALL)
        
        # LDAP Reader hesabı ile bağlantı kur
        with Connection(server, LDAP_BIND_DN, LDAP_BIND_PASSWORD) as conn:
            if not conn.bind():
                logger.error(f"LDAP bağlantısı başarısız: {conn.result}")
                return False
            
            logger.info("LDAP bağlantısı başarılı")
            
            # Tüm LDAP kullanıcılarını ara
            search_filter = '(&(objectClass=person)(objectCategory=person))'
            attributes = ['mail', 'displayName', 'sAMAccountName', 'department', 'title', 'company']
            
            logger.info(f"LDAP kullanıcı araması yapılıyor: {search_filter}")
            conn.search(LDAP_BASE_DN, search_filter, attributes=attributes)
            
            if len(conn.entries) == 0:
                logger.warning("LDAP'ta kullanıcı bulunamadı!")
                return False
            
            # Departmanları oluştur veya al
            departments = {}
            
            # Sonuçları işle
            logger.info(f"Toplam {len(conn.entries)} LDAP kullanıcısı bulundu")
            user_count = 0
            new_user_count = 0
            updated_user_count = 0
            
            for entry in conn.entries:
                username = entry.sAMAccountName.value if hasattr(entry, 'sAMAccountName') and entry.sAMAccountName else None
                email = entry.mail.value if hasattr(entry, 'mail') and entry.mail else None
                display_name = entry.displayName.value if hasattr(entry, 'displayName') and entry.displayName else None
                department = entry.department.value if hasattr(entry, 'department') and entry.department else "Genel"
                title = entry.title.value if hasattr(entry, 'title') and entry.title else None
                
                # Kullanıcı adı olmadan devam edemeyiz
                if not username:
                    logger.warning(f"Kullanıcı adı olmayan LDAP kaydı atlanıyor: {entry}")
                    continue
                
                logger.info(f"İşleniyor: {username} ({display_name}) - Departman: {department}")
                user_count += 1
                
                # Kullanıcıyı veritabanında ara
                db_user = db.query(models.User).filter(models.User.username == username).first()
                
                if db_user:
                    # Kullanıcı bilgilerini güncelle
                    logger.info(f"Veritabanında mevcut kullanıcı güncelleniyor: {username}")
                    update_needed = False
                    
                    if display_name and db_user.full_name != display_name:
                        db_user.full_name = display_name
                        update_needed = True
                    
                    # E-posta güncellerken, başka kullanıcıda bu e-posta var mı kontrol et
                    if email and db_user.email != email:
                        # Aynı e-postaya sahip başka kullanıcı var mı?
                        existing_email_user = db.query(models.User).filter(
                            models.User.email == email,
                            models.User.id != db_user.id
                        ).first()
                        
                        if existing_email_user:
                            logger.warning(
                                f"E-posta çakışması: {email} hem '{username}' hem de '{existing_email_user.username}' "
                                f"kullanıcılarında var. E-posta güncellenmedi."
                            )
                        else:
                            db_user.email = email
                            update_needed = True
                    
                    if not db_user.is_ldap:
                        db_user.is_ldap = True
                        update_needed = True
                    
                    # ÖNEMLİ: Manuel olarak pasif yapılmış kullanıcıları aktif hale getirme
                    # is_active durumunu LDAP senkronizasyonu güncellemez, manuel ayarlar korunur
                    # Bu sayede admin tarafından pasif yapılan kullanıcılar AD'den çekilse bile pasif kalır
                    
                    if update_needed:
                        try:
                            db.commit()
                            updated_user_count += 1
                        except Exception as e:
                            logger.error(f"Kullanıcı güncellenirken hata: {username} - {str(e)}")
                            db.rollback()
                            continue
                else:
                    # Yeni kullanıcı oluştur
                    logger.info(f"Yeni kullanıcı oluşturuluyor: {username}")
                    
                    # Aynı e-postaya sahip başka kullanıcı var mı kontrol et
                    if email:
                        existing_email_user = db.query(models.User).filter(
                            models.User.email == email
                        ).first()
                        
                        if existing_email_user:
                            logger.warning(
                                f"E-posta çakışması: {email} zaten '{existing_email_user.username}' "
                                f"kullanıcısında var. '{username}' için e-posta boş bırakılıyor."
                            )
                            email = None  # E-postayı boş bırak
                    
                    try:
                        # Yeni kullanıcılar varsayılan olarak aktif oluşturulur
                        # Eğer pasif olması gerekiyorsa, oluşturulduktan sonra manuel olarak pasif yapılmalıdır
                        # Bir kez pasif yapıldıktan sonra, LDAP senkronizasyonu bu durumu değiştirmez
                        new_user = models.User(
                            username=username,
                            email=email,
                            full_name=display_name,
                            is_active=True,
                            is_ldap=True
                        )
                        
                        db.add(new_user)
                        db.commit()
                        db.refresh(new_user)
                        db_user = new_user
                        new_user_count += 1
                    except Exception as e:
                        logger.error(f"Yeni kullanıcı oluşturulurken hata: {username} - {str(e)}")
                        db.rollback()
                        continue
                
                # Departmanı kontrol et ve oluştur (eğer yoksa)
                if department not in departments:
                    dept = db.query(models.Department).filter(models.Department.name == department).first()
                    if not dept:
                        logger.info(f"Yeni departman oluşturuluyor: {department}")
                        try:
                            dept = models.Department(
                                name=department,
                                description=f"{department} departmanı"
                            )
                            db.add(dept)
                            db.commit()
                            db.refresh(dept)
                        except Exception as e:
                            logger.error(f"Departman oluşturulurken hata: {department} - {str(e)}")
                            db.rollback()
                            # Hata varsa, departmanı tekrar sorgula (başkası oluşturmuş olabilir)
                            dept = db.query(models.Department).filter(models.Department.name == department).first()
                            if not dept:
                                logger.error(f"Departman bulunamadı ve oluşturulamadı: {department}")
                                continue
                    
                    departments[department] = dept
                
                # Kullanıcının mevcut departman ilişkilerini kontrol et
                user_depts = db.execute(text(
                    "SELECT department_id FROM user_departments WHERE user_id = :user_id"
                ), {"user_id": db_user.id}).fetchall()
                
                current_dept_ids = [ud[0] for ud in user_depts]
                dept_id = departments[department].id
                
                # Eğer kullanıcı zaten bu departmandaysa atla
                if dept_id in current_dept_ids:
                    logger.info(f"Kullanıcı '{username}' zaten '{department}' departmanına atanmış")
                else:
                    # Kullanıcı-departman ilişkisi oluştur
                    logger.info(f"Kullanıcı '{username}' '{department}' departmanına atanıyor")
                    try:
                        db.execute(text(
                            "INSERT INTO user_departments (user_id, department_id) VALUES (:user_id, :dept_id)"
                        ), {"user_id": db_user.id, "dept_id": dept_id})
                        db.commit()
                    except Exception as e:
                        logger.error(f"Kullanıcı-departman ilişkisi oluşturulurken hata: {username} -> {department} - {str(e)}")
                        db.rollback()
            
            logger.info("=== LDAP Senkronizasyon Özeti ===")
            logger.info(f"Toplam İşlenen Kullanıcı: {user_count}")
            logger.info(f"Yeni Oluşturulan Kullanıcı: {new_user_count}")
            logger.info(f"Güncellenen Kullanıcı: {updated_user_count}")
            logger.info(f"Oluşturulan/Kullanılan Departman Sayısı: {len(departments)}")
            
            return True
    
    except Exception as e:
        logger.error(f"LDAP senkronizasyonu sırasında hata oluştu: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    result = sync_ldap_users_with_departments()
    if result:
        logger.info("LDAP kullanıcı senkronizasyonu başarıyla tamamlandı")
        sys.exit(0)
    else:
        logger.error("LDAP kullanıcı senkronizasyonu başarısız oldu")
        sys.exit(1)