# Destek Sistemi

Ticket/Talep yönetim sistemi.

## Kurulum

### Docker ile Kurulum

```bash
# Projeyi klonlayın
git clone <repo-url>
cd destek

# Container'ları başlatın
docker-compose up -d --build
```

Sistem şu adreslerde çalışacak:
- Frontend: http://localhost:3005
- Backend API: http://localhost:8001
- PostgreSQL: localhost:5432

### Dosya Yükleme Dizini Yapılandırması

Varsayılan olarak yüklenen dosyalar `./uploads` dizininde saklanır. Container'ı şişirmemek için harici bir depolama alanı kullanabilirsiniz:

#### Yöntem 1: docker-compose.yml ile

`docker-compose.yml` dosyasında backend servisi için volume mount'u değiştirin:

```yaml
backend:
  volumes:
    - ./backend:/app
    - /mnt/storage/destek-uploads:/app/uploads  # Harici dizin
  environment:
    - UPLOAD_DIR=/app/uploads
```

#### Yöntem 2: Sistem Ayarları Arayüzünden

1. Yönetici hesabıyla giriş yapın
2. Sistem Ayarları > Genel Ayarlar sekmesine gidin
3. "Dosya Yükleme Dizini" alanını düzenleyin
4. Örnek: `/mnt/storage/destek-uploads`

**Önemli Notlar:**
- Dizin mutlak yol olmalıdır (/ ile başlamalı)
- Container'ın dizine yazma yetkisi olmalı
- Dizin mount edilmeden önce oluşturulmalıdır:
  ```bash
  sudo mkdir -p /mnt/storage/destek-uploads
  sudo chown -R 1000:1000 /mnt/storage/destek-uploads
  ```

### E-posta Yapılandırması

Sistem ayarlarından SMTP sunucu bilgilerini girerek e-posta bildirimleri aktifleştirilebilir.

### LDAP Entegrasyonu

Active Directory veya LDAP sunucusuyla entegrasyon için Genel Ayarlar bölümünden LDAP parametreleri yapılandırılabilir.

## Varsayılan Kullanıcılar

İlk başlatmada otomatik olarak oluşturulan hesaplar:

- **Admin:** admin / admin123
- **Support:** support / support123
- **User:** user / user123

**Güvenlik:** İlk girişte şifreleri mutlaka değiştirin!

## Özellikler

- Ticket/Talep yönetimi
- Dosya ekleme (PDF, DOC, resim, TIFF vb.)
- Önizleme desteği (PDF ve resimlerin thumbnail'ları)
- E-posta bildirimleri
- LDAP/AD entegrasyonu
- Kullanıcı ve departman yönetimi
- Wiki/bilgi tabanı
- Bildirim sistemi

## Geliştirme

Backend ve frontend geliştirme için:

```bash
# Backend (FastAPI)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (React)
cd frontend
npm install
npm start
```

## Lisans

Özel proje.
