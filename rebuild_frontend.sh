#!/bin/bash
# Frontend'i production modunda yeniden build et ve başlat

echo "Frontend container'ını durduruyorum..."
docker compose stop frontend

echo "Frontend container'ını ve image'ını kaldırıyorum..."
docker compose rm -f frontend
docker rmi destek-v3-frontend 2>/dev/null || true

echo "Frontend'i production build ile yeniden oluşturuyorum..."
docker compose build --no-cache frontend

echo "Frontend'i başlatıyorum..."
docker compose up -d frontend

echo "Frontend loglarını gösteriyorum..."
docker compose logs -f frontend
