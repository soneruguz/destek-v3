# Multi-stage build
FROM node:16-alpine as frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./

# Production build için environment değişkenleri
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=true
ENV ESLINT_NO_DEV_ERRORS=true

RUN npm run build

# Main container with Python + Nginx
FROM python:3.10-slim

# Nginx ve gerekli paketleri yükle
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python bağımlılıklarını yükle
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# Backend kodunu kopyala
COPY backend/ ./

# Frontend build'ini nginx'e kopyala
COPY --from=frontend-builder /app/frontend/build /var/www/html

# Nginx konfigürasyonu
COPY nginx.conf /etc/nginx/sites-available/default
RUN rm /etc/nginx/sites-enabled/default
RUN ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/

# Supervisor konfigürasyonu
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Portları aç
EXPOSE 80

# Başlatma komutu
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
