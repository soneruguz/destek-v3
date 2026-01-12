#!/usr/bin/env python3
"""
Veritabanındaki duplicate e-posta adreslerini temizler
"""
from sqlalchemy import text
from database import get_db
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("fix_duplicates")

def fix_duplicate_emails():
    """Duplicate e-posta adreslerini temizle"""
    db = next(get_db())
    
    try:
        # Duplicate e-postaları bul
        query = text("""
            SELECT email, COUNT(*) as count, array_agg(id) as user_ids
            FROM users
            WHERE email IS NOT NULL AND email != ''
            GROUP BY email
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        """)
        
        duplicates = db.execute(query).fetchall()
        
        if not duplicates:
            logger.info("✅ Duplicate e-posta bulunamadı!")
            return
        
        logger.info(f"⚠️  {len(duplicates)} duplicate e-posta tespit edildi:")
        
        for dup in duplicates:
            email = dup[0]
            count = dup[1]
            user_ids = dup[2]
            
            logger.info(f"\n📧 E-posta: {email}")
            logger.info(f"   Kullanıcı sayısı: {count}")
            logger.info(f"   Kullanıcı ID'leri: {user_ids}")
            
            # Her kullanıcıyı göster
            users_query = text("SELECT id, username, full_name, email FROM users WHERE id = ANY(:ids)")
            users = db.execute(users_query, {"ids": user_ids}).fetchall()
            
            logger.info("   Kullanıcılar:")
            for user in users:
                logger.info(f"     - ID: {user[0]}, Username: {user[1]}, Full Name: {user[2]}")
            
            # İlk kullanıcı hariç diğerlerinin e-postasını NULL yap
            if len(user_ids) > 1:
                keep_id = user_ids[0]
                clear_ids = user_ids[1:]
                
                logger.info(f"   ✅ ID {keep_id} kullanıcısında '{email}' tutulacak")
                logger.info(f"   🔄 ID {clear_ids} kullanıcılarında e-posta NULL yapılacak")
                
                # Diğer kullanıcıların e-postasını NULL yap
                clear_query = text("UPDATE users SET email = NULL WHERE id = ANY(:ids)")
                db.execute(clear_query, {"ids": clear_ids})
                db.commit()
                
                logger.info(f"   ✔️  {len(clear_ids)} kullanıcının e-postası temizlendi")
        
        logger.info("\n✅ Tüm duplicate e-postalar düzeltildi!")
        
    except Exception as e:
        logger.error(f"❌ Hata: {str(e)}", exc_info=True)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("🔧 Duplicate e-posta düzeltme işlemi başlatılıyor...")
    fix_duplicate_emails()
