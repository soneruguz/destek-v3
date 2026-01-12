import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axios';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [pushNotificationSupported, setPushNotificationSupported] = useState(false);
  const [pushNotificationEnabled, setPushNotificationEnabled] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState(null);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  
  // VAPID public key al
  const fetchVapidPublicKey = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axiosInstance.get('/notifications/vapid-public-key');
      
      if (response.data && response.data.publicKey) {
        setVapidPublicKey(response.data.publicKey);
        return response.data.publicKey;
      }
    } catch (error) {
      // Sessizce handle et - notification sistemi opsiyonel
      return null;
    }
    
    return null;
  }, [isAuthenticated]);
  
  // Service Worker kaydı
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          setServiceWorkerRegistration(registration);
          setPushNotificationSupported(true);
          
          // İzin durumunu kontrol et
          if (Notification.permission === 'granted') {
            setPushNotificationEnabled(true);
            
            // Tarayıcıda kaydedilmiş bir token olup olmadığını kontrol et
            checkStoredPushSubscription(registration);
          }
        })
        .catch(error => {
          console.error('Service Worker kayıt hatası:', error);
        });
    }
  }, []);
  
  // Kullanıcı giriş yaptığında VAPID anahtarını al
  useEffect(() => {
    if (isAuthenticated) {
      fetchVapidPublicKey();
    }
  }, [isAuthenticated, fetchVapidPublicKey]);
  
  // Kaydedilmiş push aboneliği olup olmadığını kontrol et
  const checkStoredPushSubscription = async (registration) => {
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Sunucuya token'ı gönder
        sendPushSubscriptionToServer(subscription);
      }
    } catch (error) {
      console.error('Push aboneliği kontrol hatası:', error);
    }
  };
  
  // Push aboneliği oluştur ve sunucuya gönder
  const createPushSubscription = async () => {
    if (!serviceWorkerRegistration || !vapidPublicKey) {
      // VAPID public key yoksa, backend'den almayı dene
      const publicKey = await fetchVapidPublicKey();
      if (!publicKey) return null;
    }
    
    try {
      const subscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      // Sunucuya push aboneliğini gönder
      await sendPushSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Push aboneliği oluşturma hatası:', error);
      return null;
    }
  };
  
  // Base64 formatındaki VAPID public key'i Uint8Array'e çevir
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };
  
  // Push aboneliğini sunucuya gönder
  const sendPushSubscriptionToServer = async (subscription) => {
    if (!isAuthenticated || !subscription) return;
    
    try {
      await axiosInstance.post(
        '/notifications/push-subscription', 
        { subscription: JSON.stringify(subscription) }
      );
    } catch (error) {
      console.error('Push aboneliği sunucuya gönderme hatası:', error);
    }
  };

  // Bildirimleri getir
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axiosInstance.get('/notifications');
      
      setNotifications(response.data);
      const unreadNotifications = response.data.filter(notification => !notification.is_read);
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      // Sessizce handle et - notifications opsiyonel
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // Okunmamış bildirimlerin sayısını getir
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axiosInstance.get('/notifications/unread-count');
      
      setUnreadCount(response.data);
    } catch (error) {
      console.error('Okunmamış bildirim sayısını getirme hatası:', error);
    }
  }, [isAuthenticated]);

  const defaultNotificationSettings = {
    email_notifications: false,
    browser_notifications: false,
    ticket_assigned: false,
    ticket_updated: false,
    ticket_commented: false,
    ticket_attachment: false
  };

  // Bildirim ayarlarını getir
  const fetchNotificationSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axiosInstance.get('/notifications/settings');
      
      setNotificationSettings({ ...defaultNotificationSettings, ...response.data });
    } catch (error) {
      console.error('Bildirim ayarlarını getirme hatası:', error);
      setNotificationSettings(defaultNotificationSettings);
      return defaultNotificationSettings;
    }
  }, [isAuthenticated]);

  // Bildirim ayarlarını güncelle
  const updateNotificationSettings = useCallback(async (settings) => {
    if (!isAuthenticated) return;

    // Backend'in beklediği alanlarla sınırla
    const payload = {
      email_notifications: !!settings?.email_notifications,
      browser_notifications: !!settings?.browser_notifications,
      ticket_assigned: !!settings?.ticket_assigned,
      ticket_updated: !!settings?.ticket_updated,
      ticket_commented: !!settings?.ticket_commented,
      ticket_attachment: !!settings?.ticket_attachment
    };
    
    try {
      const response = await axiosInstance.put('/notifications/settings', payload);
      
      setNotificationSettings({ ...defaultNotificationSettings, ...response.data });
      addToast('Bildirim ayarları güncellendi', 'success');
      return response.data;
    } catch (error) {
      console.error('Bildirim ayarlarını güncelleme hatası:', error);
      addToast('Bildirim ayarları güncellenirken bir hata oluştu', 'error');
      throw error;
    }
  }, [isAuthenticated, addToast]);

  // Bildirimi okundu olarak işaretle
  const markAsRead = useCallback(async (notificationId) => {
    if (!isAuthenticated) return;
    
    try {
      await axiosInstance.post(`/notifications/${notificationId}/mark-read`, {});
      
      // Lokalde bildirimi güncelle
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Okunmamış sayısını güncelle
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Bildirimi okundu olarak işaretleme hatası:', error);
    }
  }, [isAuthenticated]);

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      await axiosInstance.post('/notifications/mark-all-read', {});
      
      // Lokalde bildirimleri güncelle
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          is_read: true
        }))
      );
      
      // Okunmamış sayısını sıfırla
      setUnreadCount(0);
      addToast('Tüm bildirimler okundu olarak işaretlendi', 'success');
    } catch (error) {
      console.error('Tüm bildirimleri okundu olarak işaretleme hatası:', error);
      addToast('Bildirimler işaretlenirken bir hata oluştu', 'error');
    }
  }, [isAuthenticated, addToast]);

  // Push bildirim izni iste
  const requestPushNotificationPermission = useCallback(async () => {
    if (!pushNotificationSupported) {
      addToast('Tarayıcınız push bildirimleri desteklemiyor', 'error');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setPushNotificationEnabled(true);
        
        // Push aboneliği oluştur ve sunucuya gönder
        const subscription = await createPushSubscription();
        
        if (subscription) {
          // Başarılı kayıt
          addToast('Push bildirimleri başarıyla etkinleştirildi', 'success');
          
          // Bildirim ayarlarını güncelle (browser_notifications=true)
          if (notificationSettings) {
            await updateNotificationSettings({
              ...notificationSettings,
              browser_notifications: true
            });
          }
          
          return true;
        } else {
          addToast('Push bildirim aboneliği oluşturulamadı', 'error');
          return false;
        }
      } else {
        addToast('Push bildirim izni reddedildi', 'error');
        return false;
      }
    } catch (error) {
      console.error('Push bildirim izni hatası:', error);
      addToast('Push bildirim izni alınırken bir hata oluştu', 'error');
      return false;
    }
  }, [pushNotificationSupported, notificationSettings, updateNotificationSettings, addToast, createPushSubscription]);

  // Push bildirimleri devre dışı bırak
  const disablePushNotifications = useCallback(async () => {
    if (!pushNotificationEnabled) return true;
    
    try {
      // Mevcut aboneliği al ve iptal et
      if (serviceWorkerRegistration) {
        const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
        
        if (subscription) {
          // Sunucuya aboneliğin iptal edildiğini bildir
          await axiosInstance.delete('/notifications/push-subscription', {
            data: { subscription: JSON.stringify(subscription) }
          });
          
          // Aboneliği iptal et
          await subscription.unsubscribe();
        }
      }
      
      // Bildirim ayarlarını güncelle (browser_notifications=false)
      if (notificationSettings) {
        await updateNotificationSettings({
          ...notificationSettings,
          browser_notifications: false
        });
      }
      
      setPushNotificationEnabled(false);
      addToast('Push bildirimleri devre dışı bırakıldı', 'success');
      return true;
    } catch (error) {
      console.error('Push bildirimleri devre dışı bırakma hatası:', error);
      addToast('Push bildirimleri devre dışı bırakılırken bir hata oluştu', 'error');
      return false;
    }
  }, [pushNotificationEnabled, serviceWorkerRegistration, notificationSettings, updateNotificationSettings, addToast]);

  // Kullanıcı giriş yaptığında bildirimleri yükle
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchNotificationSettings();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationSettings(null);
    }
  }, [isAuthenticated, fetchNotifications, fetchNotificationSettings]);

  const value = {
    notifications,
    unreadCount,
    notificationSettings,
    pushNotificationSupported,
    pushNotificationEnabled,
    fetchNotifications,
    fetchUnreadCount,
    fetchNotificationSettings,
    updateNotificationSettings,
    markAsRead,
    markAllAsRead,
    requestPushNotificationPermission,
    disablePushNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};