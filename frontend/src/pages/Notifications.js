import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        loading
    } = useNotifications();
    const navigate = useNavigate();

    const getNotificationDetails = (notification) => {
        let link = '#';
        const type = notification.type.toUpperCase();

        if (type.includes('TICKET')) {
            link = `/tickets/${notification.related_id}`;
        } else if (type.includes('WIKI')) {
            link = `/wikis/${notification.related_id}`;
        }

        return { link };
    };

    const handleNotificationClick = (notification) => {
        markAsRead(notification.id);
        const { link } = getNotificationDetails(notification);
        if (link && link !== '#') {
            navigate(link);
        }
    };

    const Icons = {
        Ticket: () => <span>🎫</span>,
        Document: () => <span>📄</span>,
        Info: () => <span>ℹ️</span>
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Bildirimler</h1>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                    >
                        Tümünü okundu olarak işaretle
                    </button>
                )}
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Henüz bildiriminiz bulunmuyor.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {notifications.map((notification) => (
                            <li
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read_at ? 'bg-blue-50' : ''}`}
                            >
                                <div className="px-4 py-4 flex items-center sm:px-6">
                                    <div className="min-w-0 flex-1 flex items-center">
                                        <div className="flex-shrink-0">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${notification.type.includes('ticket')
                                                ? 'bg-yellow-100 text-yellow-600'
                                                : notification.type.includes('wiki')
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-green-100 text-green-600'
                                                }`}>
                                                {notification.type.includes('ticket') ? (
                                                    <Icons.Ticket className="h-6 w-6" />
                                                ) : notification.type.includes('wiki') ? (
                                                    <Icons.Document className="h-6 w-6" />
                                                ) : (
                                                    <Icons.Info className="h-6 w-6" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-primary-600 truncate">{notification.title}</p>
                                                <p className="mt-1 flex items-center text-sm text-gray-500">
                                                    <span className="truncate">{notification.message}</span>
                                                </p>
                                            </div>
                                            <div className="hidden md:block">
                                                <div>
                                                    <p className="text-sm text-gray-900 text-right">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: tr })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Notifications;
