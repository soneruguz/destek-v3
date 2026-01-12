#!/bin/bash

echo "Docker servisinin durumu kontrol ediliyor..."

# Docker servisinin durumunu kontrol et
if systemctl is-active --quiet docker; then
    echo "Docker servisi zaten çalışıyor."
else
    echo "Docker servisi çalışmıyor. Başlatılıyor..."
    sudo systemctl start docker
    
    # Docker'ın başlaması için bekle
    echo "Docker servisinin başlaması bekleniyor..."
    sleep 5
    
    if systemctl is-active --quiet docker; then
        echo "Docker servisi başarıyla başlatıldı."
    else
        echo "Docker servisi başlatılamadı. Lütfen sisteminizi kontrol edin."
        exit 1
    fi
fi

# Kullanıcıyı docker grubuna ekle
if ! groups $USER | grep -q docker; then
    echo "Kullanıcı docker grubuna ekleniyor..."
    sudo usermod -aG docker $USER
    echo "İşlem tamamlandı. Değişikliklerin etkili olması için oturumu kapatıp yeniden açmanız gerekebilir."
    echo "Alternatif olarak, 'sudo docker-compose' komutunu kullanabilirsiniz."
fi

# Docker'a bağlantıyı test et
echo "Docker bağlantısı test ediliyor..."
docker info >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Docker bağlantısı başarılı."
    echo "Şimdi uygulamayı başlatabilirsiniz:"
    echo "cd /home/soneruguz/destek"
    echo "docker-compose up -d"
else
    echo "Docker bağlantısında hala sorunlar var."
    echo "Şu komutu deneyebilirsiniz: sudo docker-compose up -d"
fi
