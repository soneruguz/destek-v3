#!/bin/bash

echo "Checking Docker status..."
if sudo systemctl is-active --quiet docker; then
    echo "Docker is already running."
else
    echo "Docker is not running. Starting Docker service..."
    sudo systemctl start docker
    
    # Wait for Docker to start
    echo "Waiting for Docker to start..."
    sleep 5
    
    if sudo systemctl is-active --quiet docker; then
        echo "Docker started successfully."
    else
        echo "Failed to start Docker. Please check Docker installation."
        exit 1
    fi
fi

# Add current user to docker group if not already added
if ! groups | grep -q docker; then
    echo "Adding user to docker group..."
    sudo usermod -aG docker $USER
    echo "You may need to log out and log back in for this to take effect."
    echo "Alternatively, you can run 'docker-compose' with sudo."
fi

# Try running docker info to verify connection
echo "Testing Docker connection..."
docker info >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Docker connection successful. You can now run docker-compose."
else
    echo "Still having issues connecting to Docker."
    echo "You can try running with sudo: sudo docker-compose up -d"
    exit 1
fi

# Get the server IP address automatically
SERVER_IP=$(hostname -I | awk '{print $1}')

# Check if containers already exist and stop them gracefully
echo "Checking for existing containers..."
if docker ps -a | grep -q "destek-"; then
    echo "Stopping existing containers..."
    docker-compose down --volumes
    # Additional cleanup to prevent volume conflicts
    docker volume prune -f
    echo "Containers stopped and volumes cleaned up."
fi

# Update the environment variable in docker-compose.yml for the API URL
sed -i "s|- REACT_APP_API_URL=http://.*:8001.*|- REACT_APP_API_URL=http://$SERVER_IP:8001  # Güncellendi: Sunucu IP'si|g" docker-compose.yml

echo "Server IP detected as: $SERVER_IP"
echo "Frontend will connect to backend at: http://$SERVER_IP:8001"

# Start Docker containers with rebuild option to ensure fresh start
echo "Starting Docker containers..."
docker-compose up -d --build

echo "Destek Talep Sistemi başlatıldı."
echo "Frontend erişimi: http://$SERVER_IP:3000"
echo "Backend erişimi: http://$SERVER_IP:8001"
