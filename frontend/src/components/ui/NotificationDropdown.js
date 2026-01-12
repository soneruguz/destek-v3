import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

// Simple icon replacements
const Icons = {
  Bell: () => <span>🔔</span>,
  Ticket: () => <span>🎫</span>,
  Document: () => <span>📄</span>,
  InformationCircle: () => <span>ℹ️</span>
};

const NotificationDropdown = () => {
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Bildirimleri yükle
    fetchNotifications();
    
    // 30 saniyede bir bildirimleri yenile
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Dışarı tıklandığında dropdown'ı kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Bildirime tıklandığında
  const handleNotificationClick = (notification) => {
    // Bildirimi okundu olarak işaretle
    markAsRead(notification.id);
    
    // İlgili sayfaya yönlendir
    if (notification.link) {
      navigate(notification.link);
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:shadow-outline focus:text-gray-500 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">Bildirimler</span>
        <Icons.Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-600 text-white text-xs flex items-center justify-center transform translate-x-1 -translate-y-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg z-50">
          <div className="rounded-md bg-white shadow-xs">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900">Bildirimler</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    markAllAsRead();
                    setIsOpen(false);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Tümünü okundu olarak işaretle
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Henüz bildiriminiz bulunmuyor.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 flex cursor-pointer hover:bg-gray-50 ${
                        !notification.read_at ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mr-3">
                        {/* Bildirim tipi simgesi */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          notification.type.includes('ticket') 
                            ? 'bg-yellow-100 text-yellow-600' 
                            : notification.type.includes('wiki') 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                        }`}>
                          {notification.type.includes('ticket') ? (
                            <Icons.Ticket className="h-4 w-4" />
                          ) : notification.type.includes('wiki') ? (
                            <Icons.Document className="h-4 w-4" />
                          ) : (
                            <Icons.InformationCircle className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: tr
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-sm text-center text-primary-600 hover:text-primary-800"
              >
                Tüm bildirimleri görüntüle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;