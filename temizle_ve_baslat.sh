#!/bin/bash

echo "Docker temizleniyor ve sistem yeniden başlatılıyor..."

# Tüm konteynerleri durdur
echo "Tüm konteynerleri durduruyorum..."
docker-compose down

# Docker volume'lerini temizle
echo "Eski volume'leri temizliyorum..."
docker volume rm destek_frontend_node_modules || true

# Docker önbelleğini temizle
echo "Docker önbelleğini temizliyorum..."
docker system prune -f

# Projeyi tekrar başlat
echo "Projeyi yeniden başlatıyorum..."
docker-compose up -d --build

# Backend konteynerine girip models.py dosyasını kontrol et
echo "Backend konteynerine bağlanıp init_db.py çalıştırılıyor..."
sleep 10 # Konteynerlerin başlaması için bekle
docker exec -it destek-backend python init_db.py || echo "Database başlatma başarısız oldu. Konteyner adını kontrol edin."

echo "İşlem tamamlandı. http://localhost:3000 adresinden uygulamaya erişebilirsiniz."
echo "Giriş bilgileri: username=admin, password=admin"
