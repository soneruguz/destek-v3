import React, { useEffect, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';

const defaultSettings = {
  email_notifications: false,
  browser_notifications: false,
  ticket_assigned: false,
  ticket_updated: false,
  ticket_commented: false,
  ticket_attachment: false
};

const NotificationSettings = () => {
  const {
    notificationSettings,
    fetchNotificationSettings,
    updateNotificationSettings,
    pushNotificationSupported,
    pushNotificationEnabled,
    requestPushNotificationPermission,
    disablePushNotifications
  } = useNotifications();
  const { addToast } = useToast();

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notificationSettings) {
      setSettings(prev => ({ ...prev, ...notificationSettings }));
    } else {
      fetchNotificationSettings();
    }
  }, [notificationSettings, fetchNotificationSettings]);

  const handleChange = (event) => {
    const { name, checked } = event.target;
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await updateNotificationSettings(settings);
      addToast('Bildirim ayarları başarıyla güncellendi', 'success');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      addToast('Bildirim ayarları güncellenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    const enabled = await requestPushNotificationPermission();
    if (enabled) {
      setSettings(prev => ({ ...prev, browser_notifications: true }));
    }
  };

  const handleDisablePushNotifications = async () => {
    const disabled = await disablePushNotifications();
    if (disabled) {
      setSettings(prev => ({ ...prev, browser_notifications: false }));
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Bildirim Ayarları</h3>
            <p className="mt-1 text-sm text-gray-500">
              E-posta ve tarayıcı bildirim tercihlerinizi yönetin.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">E-posta Bildirimleri</h4>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="email_notifications"
                  name="email_notifications"
                  type="checkbox"
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  checked={Boolean(settings.email_notifications)}
                  onChange={handleChange}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="email_notifications" className="font-medium text-gray-700">
                  E-posta bildirimlerini etkinleştir
                </label>
                <p className="text-gray-500">Seçili olaylar için e-posta al.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Tarayıcı Bildirimleri</h4>
            {pushNotificationSupported ? (
              <>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="browser_notifications"
                      name="browser_notifications"
                      type="checkbox"
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                      checked={Boolean(settings.browser_notifications)}
                      onChange={handleChange}
                      disabled={!pushNotificationEnabled}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="browser_notifications" className="font-medium text-gray-700">
                      Tarayıcı bildirimleri gönder
                    </label>
                    <p className="text-gray-500">
                      Tarayıcınızda anlık bildirimler alın.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  {!pushNotificationEnabled ? (
                    <button
                      type="button"
                      onClick={handleEnablePushNotifications}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Tarayıcı Bildirimlerini Etkinleştir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDisablePushNotifications}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Tarayıcı Bildirimlerini Devre Dışı Bırak
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Tarayıcınız push bildirimlerini desteklemiyor.</p>
            )}
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900">Bildirim Tercihleri</h4>
            <p className="text-sm text-gray-500 mb-4">Hangi olaylar için bildirim almak istediğinizi seçin.</p>

            <div className="space-y-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ticket_assigned"
                    name="ticket_assigned"
                    type="checkbox"
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={Boolean(settings.ticket_assigned)}
                    onChange={handleChange}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="ticket_assigned" className="font-medium text-gray-700">Talep atandığında</label>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ticket_updated"
                    name="ticket_updated"
                    type="checkbox"
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={Boolean(settings.ticket_updated)}
                    onChange={handleChange}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="ticket_updated" className="font-medium text-gray-700">Talep güncellendiğinde</label>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ticket_commented"
                    name="ticket_commented"
                    type="checkbox"
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={Boolean(settings.ticket_commented)}
                    onChange={handleChange}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="ticket_commented" className="font-medium text-gray-700">Talebe yorum eklendiğinde</label>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ticket_attachment"
                    name="ticket_attachment"
                    type="checkbox"
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    checked={Boolean(settings.ticket_attachment)}
                    onChange={handleChange}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="ticket_attachment" className="font-medium text-gray-700">Talebe dosya eklendiğinde</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-6 border-t bg-gray-50 text-right">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
