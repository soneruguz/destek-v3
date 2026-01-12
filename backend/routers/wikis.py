from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import datetime
import re

from database import get_db
import models, schemas
from auth import get_current_active_user

router = APIRouter(tags=["wikis"])

def slugify(text):
    """Metni URL-dostu bir hale getirir"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

def check_wiki_access(wiki_id: int, user: models.User, db: Session):
    """Kullanıcının bir wiki'ye erişim hakkı olup olmadığını kontrol eder"""
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    
    if not wiki:
        return False
    
    # Admin her zaman erişebilir
    if user.is_admin:
        return True
    
    # Oluşturan kişi her zaman erişebilir
    if wiki.creator_id == user.id:
        return True
    
    # Gizli ise, paylaşımı kontrol et
    if wiki.is_private:
        # Kullanıcıyla doğrudan paylaşılmış mı?
        user_share = db.query(models.wiki_user_share).filter(
            models.wiki_user_share.c.wiki_id == wiki_id,
            models.wiki_user_share.c.user_id == user.id
        ).first()
        
        if user_share:
            return True
        
        # Kullanıcının departmanı ile paylaşılmış mı?
        dept_share = db.query(models.wiki_department_share).join(
            models.user_department_association,
            models.wiki_department_share.c.department_id == models.user_department_association.c.department_id
        ).filter(
            models.wiki_department_share.c.wiki_id == wiki_id,
            models.user_department_association.c.user_id == user.id
        ).first()
        
        if dept_share:
            return True
            
        return False
    
    # Gizli değilse ve departman ayarlanmışsa, kullanıcı o departmanda mı?
    if wiki.department_id:
        dept_membership = db.query(models.user_department_association).filter(
            models.user_department_association.c.department_id == wiki.department_id,
            models.user_department_association.c.user_id == user.id
        ).first()
        
        if dept_membership:
            return True
            
        return False
    
    # Gizli değil ve departman ayarlanmamışsa, herkes erişebilir
    return True

@router.post("/", response_model=schemas.Wiki)
def create_wiki(
    wiki: schemas.WikiCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Slug oluştur
    base_slug = slugify(wiki.title)
    slug = base_slug
    
    # Slug çakışmasını kontrol et
    counter = 1
    while db.query(models.Wiki).filter(models.Wiki.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Yeni wiki oluştur
    new_wiki = models.Wiki(
        title=wiki.title,
        slug=slug,
        creator_id=current_user.id,
        department_id=wiki.department_id,
        is_private=wiki.is_private
    )
    
    db.add(new_wiki)
    db.commit()
    db.refresh(new_wiki)
    
    # İlk revizyonu oluştur
    new_revision = models.WikiRevision(
        wiki_id=new_wiki.id,
        content=wiki.content,
        creator_id=current_user.id
    )
    
    db.add(new_revision)
    db.commit()
    db.refresh(new_revision)
    
    # Wiki nesnesini schema'ya uygun şekilde döndür
    return schemas.Wiki(
        id=new_wiki.id,
        title=new_wiki.title,
        slug=new_wiki.slug,
        creator_id=new_wiki.creator_id,
        department_id=new_wiki.department_id,
        is_private=new_wiki.is_private,
        created_at=new_wiki.created_at,
        updated_at=new_wiki.updated_at
    )

@router.get("/", response_model=List[schemas.Wiki])
def get_wikis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    department_id: int = None,
    search: str = None
):
    # Base sorgu
    query = db.query(models.Wiki)
    
    # Eğer admin değilse, erişim kontrolü uygula
    if not current_user.is_admin:
        # Kullanıcının departmanlarını bul
        user_departments = [dept.id for dept in current_user.departments]
        
        # Erişim filtresini oluştur
        wiki_filter = [
            # 1. Kullanıcının oluşturduğu wiki'ler
            models.Wiki.creator_id == current_user.id,
            
            # 2. Açık olan ve departman atanmamış wiki'ler
            (models.Wiki.is_private == False) & (models.Wiki.department_id == None),
            
            # 3. Açık olan ve kullanıcının departmanına ait wiki'ler
            (models.Wiki.is_private == False) & (models.Wiki.department_id.in_(user_departments))
        ]
        
        # 4. Kullanıcıyla doğrudan paylaşılan wiki'ler (özel wiki'ler dahil)
        shared_with_user = db.query(models.wiki_user_share.c.wiki_id).filter(
            models.wiki_user_share.c.user_id == current_user.id
        ).subquery()
        wiki_filter.append(models.Wiki.id.in_(shared_with_user))
        
        # 5. Kullanıcının departmanlarıyla paylaşılan wiki'ler (özel wiki'ler dahil)
        if user_departments:
            shared_with_dept = db.query(models.wiki_department_share.c.wiki_id).filter(
                models.wiki_department_share.c.department_id.in_(user_departments)
            ).subquery()
            wiki_filter.append(models.Wiki.id.in_(shared_with_dept))
        
        # Tüm filtreleri OR operatörü ile birleştir
        query = query.filter(or_(*wiki_filter))
    
    # Departman filtresi
    if department_id:
        query = query.filter(models.Wiki.department_id == department_id)
    
    # Arama filtresi
    if search:
        query = query.filter(models.Wiki.title.ilike(f"%{search}%"))
    
    # Sonuçları al
    wikis = query.all()
    
    # Revizyon bilgilerini ekle
    result = []
    for wiki in wikis:
        # Son revizyonu al
        latest_revision = db.query(models.WikiRevision).filter(
            models.WikiRevision.wiki_id == wiki.id
        ).order_by(models.WikiRevision.created_at.desc()).first()
        
        # Eğer hiç revizyon yoksa, atla
        if not latest_revision:
            continue
        
        # Sonuçlar listesine ekle
        result.append({
            **wiki.__dict__,
            "current_revision": latest_revision
        })
    
    return result

@router.get("/{wiki_id}", response_model=schemas.WikiDetail)
def get_wiki(
    wiki_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Wiki var mı kontrol et
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    if not wiki:
        raise HTTPException(status_code=404, detail="Wiki bulunamadı")
    
    # Erişim kontrolü
    if not check_wiki_access(wiki_id, current_user, db):
        raise HTTPException(status_code=403, detail="Bu wiki'yi görüntüleme izniniz yok")
    
    # Son revizyon
    latest_revision = db.query(models.WikiRevision).filter(
        models.WikiRevision.wiki_id == wiki_id
    ).order_by(models.WikiRevision.created_at.desc()).first()
    
    # Tüm revizyonlar
    revisions = db.query(models.WikiRevision).filter(
        models.WikiRevision.wiki_id == wiki_id
    ).order_by(models.WikiRevision.created_at.desc()).all()
    
    # Sonucu döndür
    result = {
        **wiki.__dict__,
        "current_revision": latest_revision,
        "revisions": revisions
    }
    
    return result

@router.get("/slug/{slug}", response_model=schemas.WikiDetail)
def get_wiki_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Wiki var mı kontrol et
    wiki = db.query(models.Wiki).filter(models.Wiki.slug == slug).first()
    if not wiki:
        raise HTTPException(status_code=404, detail="Wiki bulunamadı")
    
    # Erişim kontrolü
    if not check_wiki_access(wiki.id, current_user, db):
        raise HTTPException(status_code=403, detail="Bu wiki'yi görüntüleme izniniz yok")
    
    # Son revizyon
    latest_revision = db.query(models.WikiRevision).filter(
        models.WikiRevision.wiki_id == wiki.id
    ).order_by(models.WikiRevision.created_at.desc()).first()
    
    # Tüm revizyonlar
    revisions = db.query(models.WikiRevision).filter(
        models.WikiRevision.wiki_id == wiki.id
    ).order_by(models.WikiRevision.created_at.desc()).all()
    
    # Sonucu döndür
    result = {
        **wiki.__dict__,
        "current_revision": latest_revision,
        "revisions": revisions
    }
    
    return result

@router.post("/{wiki_id}/revisions", response_model=schemas.WikiRevision)
def create_wiki_revision(
    wiki_id: int,
    revision: schemas.WikiRevisionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Wiki var mı kontrol et
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    if not wiki:
        raise HTTPException(status_code=404, detail="Wiki bulunamadı")
    
    # Erişim kontrolü - düzenleme için creator veya admin olmalı
    if not (wiki.creator_id == current_user.id or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Bu wiki'yi düzenleme izniniz yok")
    
    # Yeni revizyon oluştur
    new_revision = models.WikiRevision(
        wiki_id=wiki_id,
        content=revision.content,
        creator_id=current_user.id
    )
    
    db.add(new_revision)
    db.commit()
    db.refresh(new_revision)
    
    # Wiki güncelleme zamanını şimdi olarak ayarla
    wiki.updated_at = datetime.now()
    db.commit()
    
    return new_revision

@router.put("/{wiki_id}", response_model=schemas.Wiki)
def update_wiki(
    wiki_id: int,
    wiki_update: schemas.WikiBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Wiki var mı kontrol et
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    if not wiki:
        raise HTTPException(status_code=404, detail="Wiki bulunamadı")
    
    # Erişim kontrolü - düzenleme için creator veya admin olmalı
    if not (wiki.creator_id == current_user.id or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Bu wiki'yi düzenleme izniniz yok")
    
    # Başlık değiştiyse yeni slug oluştur
    if wiki.title != wiki_update.title:
        base_slug = slugify(wiki_update.title)
        slug = base_slug
        
        # Slug çakışmasını kontrol et
        counter = 1
        while db.query(models.Wiki).filter(models.Wiki.slug == slug, models.Wiki.id != wiki_id).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        wiki.slug = slug
    
    # Wiki bilgilerini güncelle
    wiki.title = wiki_update.title
    wiki.is_private = wiki_update.is_private
    wiki.department_id = wiki_update.department_id
    wiki.updated_at = datetime.now()
    
    db.commit()
    db.refresh(wiki)
    
    # Son revizyonu al
    latest_revision = db.query(models.WikiRevision).filter(
        models.WikiRevision.wiki_id == wiki_id
    ).order_by(models.WikiRevision.created_at.desc()).first()
    
    # Sonucu döndür
    result = {
        **wiki.__dict__,
        "current_revision": latest_revision
    }
    
    return result

@router.delete("/{wiki_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wiki(
    wiki_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Wiki var mı kontrol et
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    if not wiki:
        raise HTTPException(status_code=404, detail="Wiki bulunamadı")
    
    # Erişim kontrolü - silme için creator veya admin olmalı
    if not (wiki.creator_id == current_user.id or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Bu wiki'yi silme izniniz yok")
    
    # Wiki'yi sil (cascade ile revizyonlar da silinecektir)
    db.delete(wiki)
    db.commit()
    
    return None

@router.post("/{wiki_id}/share", response_model=schemas.Wiki)
def share_wiki(
    wiki_id: int,
    share_data: schemas.WikiShare,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Wiki var mı kontrol et
    wiki = db.query(models.Wiki).filter(models.Wiki.id == wiki_id).first()
    if not wiki:
        raise HTTPException(status_code=404, detail="Wiki bulunamadı")
    
    # Erişim kontrolü - paylaşım için creator veya admin olmalı
    if not (wiki.creator_id == current_user.id or current_user.is_admin):
        raise HTTPException(status_code=403, detail="Bu wiki'yi paylaşma izniniz yok")
    
    # Kullanıcılarla paylaş
    if share_data.user_ids:
        for user_id in share_data.user_ids:
            # Paylaşımı kontrol et
            existing_share = db.query(models.wiki_user_share).filter(
                models.wiki_user_share.c.wiki_id == wiki_id,
                models.wiki_user_share.c.user_id == user_id
            ).first()
            
            if not existing_share:
                # Yeni paylaşım ekle
                share = {"wiki_id": wiki_id, "user_id": user_id}
                db.execute(models.wiki_user_share.insert().values(**share))
    
    # Departmanlarla paylaş
    if share_data.department_ids:
        for dept_id in share_data.department_ids:
            # Paylaşımı kontrol et
            existing_share = db.query(models.wiki_department_share).filter(
                models.wiki_department_share.c.wiki_id == wiki_id,
                models.wiki_department_share.c.department_id == dept_id
            ).first()
            
            if not existing_share:
                # Yeni paylaşım ekle
                share = {"wiki_id": wiki_id, "department_id": dept_id}
                db.execute(models.wiki_department_share.insert().values(**share))
    
    db.commit()
    
    # Son revizyonu al
    latest_revision = db.query(models.WikiRevision).filter(
        models.WikiRevision.wiki_id == wiki_id
    ).order_by(models.WikiRevision.created_at.desc()).first()
    
    # Sonucu döndür
    result = {
        **wiki.__dict__,
        "current_revision": latest_revision
    }
    
    return result