#!/bin/bash
# Production deployment script for combined container

echo "🚀 Production deployment starting..."

# Remove old directory
echo "📁 Removing old destek directory..."
sudo rm -rf /home/dockadm/destek

# Clone fresh repo
echo "📥 Cloning fresh repository..."
cd /home/dockadm
git clone https://github.com/uguzsoner/destek.git
cd destek

# Create .env file
echo "⚙️  Creating .env file..."
cat > .env << 'EOF'
DATABASE_URL=postgresql://destek_user:destek_pass@db:5432/destek_db
CORS_ORIGINS=https://destek.tesmer.org.tr,http://localhost
UPLOAD_DIR=/app/uploads
SMTP_SERVER=mail.tesmer.org.tr
SMTP_PORT=587
SMTP_FROM_EMAIL=support@tesmer.org.tr
SECRET_KEY=your-super-secret-key-change-this-in-production
EOF

# Stop old containers
echo "🛑 Stopping old containers..."
docker compose down 2>/dev/null || true

# Start combined container
echo "🐳 Starting combined container..."
docker compose -f docker-compose.combined.yml up -d --build

# Show status
echo "📊 Container status:"
docker compose -f docker-compose.combined.yml ps

echo "✅ Deployment complete!"
echo "🌐 Application should be available at https://destek.tesmer.org.tr"
