#!/bin/bash
# PRODUCTION DEPLOYMENT GUIDE
# Production sunucusunda (192.168.0.212) çalıştırmak için

echo "=========================================="
echo "PRODUCTION KURULUM ADIMLARI"
echo "=========================================="
echo ""

# 1. Git'ten en son kodu al
echo "1️⃣  Git'ten en son kodu indiriyoruz..."
cd /home/dockadm/destek
git pull origin main

# 2. .env dosyasını hazırla
echo ""
echo "2️⃣  .env dosyasını hazırlıyoruz..."
cp .env.production .env

echo "⚠️  ÖNEMLI: .env dosyasını düzenleyin:"
echo "   - CORS_ORIGINS: https://destek.tesmer.org.tr"
echo "   - SECRET_KEY: Güvenli bir anahtar belirleyin"
echo "   - SMTP_USERNAME: Email gönderim kullanıcısı"
echo "   - SMTP_PASSWORD: Email gönderim şifresi"
echo ""
read -p "Press ENTER after editing .env file..."

# 3. Nginx yapılandırması
echo ""
echo "3️⃣  Nginx yapılandırması..."
echo "   Aşağıdaki komutu root veya sudo olarak çalıştırın:"
echo ""
echo "   sudo cp nginx_production.conf /etc/nginx/sites-available/destek"
echo "   sudo ln -sf /etc/nginx/sites-available/destek /etc/nginx/sites-enabled/destek"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "   SSL sertifikalarının /etc/nginx/ssl/ klasöründe olduğundan emin olun:"
echo "   - destek.tesmer.org.tr.crt"
echo "   - destek.tesmer.org.tr.key"
echo ""
read -p "Press ENTER after Nginx configuration..."

# 4. Docker containers'ı çalıştır
echo ""
echo "4️⃣  Docker containers'ı başlatıyoruz..."
docker compose down  # Eski containers'ı durdur
docker compose up -d

# 5. Logları kontrol et
echo ""
echo "5️⃣  Kontrol ediliyor..."
sleep 3

echo ""
echo "Backend logs (last 10 lines):"
docker compose logs backend | tail -10

echo ""
echo "Frontend logs (last 10 lines):"
docker compose logs frontend | tail -10

echo ""
echo "=========================================="
echo "✅ KURULUM TAMAMLANDI"
echo "=========================================="
echo ""
echo "🌐 Aplikasyonun adresine gidin: https://destek.tesmer.org.tr"
echo ""
echo "🔍 Sorun giderme:"
echo "   - Logs görmek: docker compose logs -f [service]"
echo "   - Containers: docker compose ps"
echo "   - Restart: docker compose restart"
echo ""
