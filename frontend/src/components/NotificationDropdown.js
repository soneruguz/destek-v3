import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();

  // Yeni bildirimler için düzenli aralıklarla kontrol et
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 saniyede bir kontrol et (WoW etkisi için)

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Dropdown dışına tıklama kontrolü
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

  // Bildirimi okundu olarak işaretle ve ilgili sayfaya yönlendir
  const handleNotificationClick = (notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  // Bildirimin türüne göre ikon ve yönlendirme URL'si belirle
  const getNotificationDetails = (notification) => {
    let icon = null;
    let url = '#';

    const type = notification.type.toUpperCase();

    switch (type) {
      case 'TICKET_CREATED':
      case 'TICKET_UPDATED':
      case 'TICKET_ASSIGNED':
      case 'TICKET_COMMENTED':
        icon = <BellIcon className="h-5 w-5 text-blue-500" />;
        url = `/tickets/${notification.related_id}`;
        break;
      case 'WIKI_CREATED':
      case 'WIKI_UPDATED':
        icon = <DocumentIcon className="h-5 w-5 text-green-500" />;
        url = `/wikis/${notification.related_id}`;
        break;
      case 'WIKI_SHARED':
        icon = <ShareIcon className="h-5 w-5 text-indigo-500" />;
        url = `/wikis/${notification.related_id}`;
        break;
      default:
        icon = <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }

    return { icon, url };
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="sr-only">Bildirimleri göster</span>
        <BellIcon className="h-6 w-6" />

        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Bildirimler</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tümünü okundu işaretle
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  Bildirim bulunmuyor
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => {
                  const { icon, url } = getNotificationDetails(notification);
                  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: tr
                  });

                  return (
                    <Link
                      key={notification.id}
                      to={url}
                      onClick={() => handleNotificationClick(notification)}
                      className={`block px-4 py-3 hover:bg-gray-50 transition-colors ${!notification.read_at ? 'bg-blue-50' : ''
                        }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read_at ? 'font-semibold' : 'font-normal'} text-gray-900`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {timeAgo}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {notifications.length > 10 && (
              <div className="px-4 py-2 border-t border-gray-200 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tüm bildirimleri görüntüle
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// İkonlar
const BellIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const DocumentIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const InformationCircleIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ShareIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7a4 4 0 110-8 4 4 0 010 8zm0 2a6 6 0 00-6 6v1a1 1 0 001 1h10a1 1 0 001-1v-1a6 6 0 00-6-6zm10-2a4 4 0 110-8 4 4 0 010 8zm0 2a6 6 0 00-6 6v1a1 1 0 001 1h10a1 1 0 001-1v-1a6 6 0 00-6-6z" />
  </svg>
);

export default NotificationDropdown;