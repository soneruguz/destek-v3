# 🚀 Production Deployment Guide

## Hızlı Başlangıç

Production sunucusunda (192.168.0.212) şu adımları izleyin:

### 1. Repoyu Clone Edin
```bash
cd /home/dockadm
git clone <repo-url> destek
cd destek
```

### 2. Ortam Dosyasını Hazırlayın
```bash
cp .env.production .env
```

`.env` dosyasını düzenleyin:
- **CORS_ORIGINS**: `https://destek.tesmer.org.tr,https://localhost`
- **SECRET_KEY**: Güvenli bir anahtar belirleyin (örn: `openssl rand -hex 32`)
- **SMTP_USERNAME**: Email gönderim kullanıcısı
- **SMTP_PASSWORD**: Email gönderim şifresi

### 3. Dış Nginx Proxy Yapılandırması

Eğer dış bir Nginx proxy sunucusu var ise (SSL sertifikaları orada), o sunucunun config'ine ekle:

```nginx
upstream backend {
    server 192.168.0.212:8001;
}

upstream frontend {
    server 192.168.0.212:3005;
}

server {
    listen 443 ssl http2;
    server_name destek.tesmer.org.tr;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/destek.tesmer.org.tr.crt;
    ssl_certificate_key /etc/nginx/ssl/destek.tesmer.org.tr.key;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 4. Docker Containers'ı Başlatın
```bash
docker compose down  # Eski containers'ı durdur
docker compose up -d
```

Containers çalışacak (Frontend ve Backend):
- Backend: `http://localhost:8000` (internal only, dış Nginx reverse proxy'nin arkasında)
- Frontend: `http://localhost:3000` (internal only, dış Nginx reverse proxy'nin arkasında)
- Dış istek: `https://destek.tesmer.org.tr` (dış Nginx proxy tarafından karşılanır)

### 5. Kontrol Edin
```bash
docker compose ps              # Tüm containers
docker compose logs -f backend    # Backend logları
docker compose logs -f frontend   # Frontend logları
```

## Sorun Giderme

### Mixed Content Hatası
Frontend HTTPS, backend HTTP'den çağrırsa hata oluşur. Bu sabit edildi:
- Frontend `window.location.origin/api` kullanır
- Nginx reverse proxy ile `/api/*` → `http://backend:8000/*` yönlendirilir

### CORS Hatası
Backend'in `CORS_ORIGINS` ortam değişkeni doğru domain'i içerdiğinden emin olun:
```bash
# .env dosyasında
CORS_ORIGINS=https://destek.tesmer.org.tr,https://localhost
```

### SSL Sertifikası Hatası
Eğer dış Nginx proxy'niz var ve SSL çalışmıyorsa:
```bash
# Dış Nginx sunucusunda sertifikaları kontrol et
ls -la /etc/nginx/ssl/

# Nginx test et
nginx -t

# Nginx restart et
systemctl reload nginx
```

## Yapı

```
destek/
├── backend/              # FastAPI API
│   ├── main.py          # CORS config
│   ├── routers/
│   │   └── system_settings.py  # /settings/public/config endpoint
│   └── Dockerfile
├── frontend/            # React SPA
│   ├── src/
│   │   └── config/
│   │       └── apiConfig.js  # Dynamic API URL
│   └── Dockerfile
├── docker-compose.yml   # Backend + Frontend (Nginx dışta)
├── .env.production      # Template for .env
└── PRODUCTION_DEPLOYMENT.md
```

**Not**: Nginx proxy dış sunucuda (SSL sertifikaları orada)
- Docker sunucusu: Backend ve Frontend (port expose etmiyor)
- Proxy sunucusu: Nginx ile SSL ve reverse proxy

## API Endpoints

### Public (No Auth Required)
- `GET /api/settings/public/config` - Genel config (dosya boyutu, varsayılan birim, vb.)

### Protected (Auth Required)
- `POST /api/tickets/` - Talep oluştur
- `GET /api/departments/` - Birimleri listele
- `GET /api/settings/` - Admin panel ayarları

## Önemli Notlar

1. **SSL/TLS**: Dış Nginx proxy sunucusunda sağlanır
2. **CORS**: Frontend domain'ini .env `CORS_ORIGINS`'e ekleyin
3. **Database**: PostgreSQL container'ında `destek_db` var
4. **Uploads**: `/app/uploads` volume'ü persistent veri için
5. **Containers**: Sadece Backend ve Frontend (internal network)
6. **Logs**: `docker compose logs` ile erişin

## Daha Fazla Yardım

Sorunlar için:
```bash
# Tüm logları göster
docker compose logs

# Specific container
docker compose logs -f backend

# Container'a shell ile gir
docker compose exec backend sh

# Problem diagnosis
docker compose exec backend python -c "import models; print('DB OK')"
```
