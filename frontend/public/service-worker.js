// Service Worker for Web Push Notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  let notificationData = {};
  
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = {
      title: 'Destek Sistemi',
      body: event.data.text(),
      icon: '/logo192.png',
      badge: '/favicon.ico'
    };
  }

  const title = notificationData.title || 'Destek Sistemi';
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/logo192.png',
    badge: notificationData.badge || '/favicon.ico',
    data: notificationData.data || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received');

  event.notification.close();

  // Bildirime tıklandığında yönlendirme yapılacak URL
  let url = '/';
  
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  // URL'yi açacak şekilde client'ı göster
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Zaten açık olan bir pencere varsa, onu odakla
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      
      // Açık bir pencere yoksa, yeni bir pencere aç
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Service Worker'ın yüklenmesi
self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('[Service Worker] Installed');
});

// Service Worker'ın aktifleştirilmesi
self.addEventListener('activate', function(event) {
  return self.clients.claim();
});