import React, { useState, useEffect, useCallback } from 'react';
import { notificationService, PushNotification, NotificationPreferences } from '../services/notificationService';
import { useApp } from '../hooks/useApp';
import { BellIcon, XMarkIcon, CogIcon, CheckIcon } from './Icons';

interface NotificationManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ isOpen, onClose }) => {
  const { t, addNotification } = useApp();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationService.getNotifications(1, 20);
      setNotifications(result.notifications);
      
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Initialize push notifications
  const initializePushNotifications = useCallback(async () => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }

    // Set up real-time notifications
    const ws = notificationService.setupRealTimeNotifications(
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        addNotification(notification.message, notification.type === 'error' ? 'error' : 'info');
      },
      (notification) => {
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? notification : n)
        );
      }
    );

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [addNotification]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
      loadPreferences();
      
      // Initialize push notifications asynchronously
      const setupNotifications = async () => {
        try {
          await initializePushNotifications();
        } catch (error) {
          console.error('Error initializing push notifications:', error);
        }
      };
      
      setupNotifications();
    }
  }, [isOpen, loadNotifications, loadPreferences, initializePushNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.isRead ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleEnablePush = async () => {
    try {
      const subscription = await notificationService.subscribeToPush();
      if (subscription) {
        setPushEnabled(true);
        addNotification(t('pushNotificationsEnabled'), 'success');
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      addNotification(t('pushNotificationsError'), 'error');
    }
  };

  const handleUpdatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      const updated = await notificationService.updatePreferences(newPreferences);
      setPreferences(updated);
      addNotification(t('preferencesUpdated'), 'success');
    } catch (error) {
      console.error('Error updating preferences:', error);
      addNotification(t('preferencesUpdateError'), 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BellIcon className="w-6 h-6 text-iom-blue mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                {t('notifications')}
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title={t('notificationSettings')}
              >
                <CogIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
                title={t('close')}
                aria-label={t('close')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preferences Panel */}
          {showPreferences && preferences && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-3">{t('notificationSettings')}</h4>
              
              {/* Push Notification Toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('pushNotifications')}</span>
                  <button
                    onClick={pushEnabled ? undefined : handleEnablePush}
                    disabled={pushEnabled}
                    className={`px-3 py-1 text-xs rounded ${
                      pushEnabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    }`}
                  >
                    {pushEnabled ? t('enabled') : t('enable')}
                  </button>
                </div>
              </div>

              {/* Email Preferences */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">{t('emailNotifications')}</h5>
                {Object.entries(preferences.email).map(([key, enabled]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        const newPreferences = {
                          ...preferences,
                          email: { ...preferences.email, [key]: e.target.checked }
                        };
                        handleUpdatePreferences(newPreferences);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{t(key)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mb-4">
            <button
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="text-sm text-iom-blue hover:text-iom-blue/80 disabled:text-gray-400"
            >
              {t('markAllAsRead')}
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-iom-blue mx-auto"></div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      !notification.isRead ? 'bg-blue-50 border-l-blue-500' : 'bg-gray-50 border-l-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title={t('markAsRead')}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title={t('delete')}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BellIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('noNotifications')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManager;