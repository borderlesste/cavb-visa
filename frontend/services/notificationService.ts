import { enhancedApi } from './apiInterceptors';
import { API_ROUTES } from '../constants';

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId: string;
  applicationId?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface EmailNotification {
  id: string;
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: string;
  error?: string;
}

export interface NotificationPreferences {
  email: {
    applicationUpdates: boolean;
    documentRequests: boolean;
    appointmentReminders: boolean;
    systemAnnouncements: boolean;
  };
  push: {
    applicationUpdates: boolean;
    documentRequests: boolean;
    appointmentReminders: boolean;
    systemAnnouncements: boolean;
  };
}

class NotificationService {
  private baseUrl = `${API_ROUTES.BASE_URL}/notifications`;
  private pushSubscription: PushSubscription | null = null;
  private enableDevSW = !!import.meta.env.VITE_ENABLE_SW_DEV;

  // Push Notifications
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('This browser does not support service workers');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      // Development behavior: only register if explicitly enabled.
      if (import.meta.env.DEV && !this.enableDevSW) {
        const regs = await navigator.serviceWorker.getRegistrations();
        // Keep environment clean: unregister old SWs so HMR works reliably.
        regs.forEach(r => r.unregister());
        return null;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      // Attempt update check (non-blocking)
      registration.update().catch(() => {});
      console.log('[SW] Registered', registration.scope);
      return registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
      return null;
    }
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    try {
      // Request permission first (faster fail if denied)
      const hasPermission = await this.requestPushPermission();
      if (!hasPermission) return null;

      const registration = await this.registerServiceWorker();
      if (!registration) return null;

      // If already subscribed reuse
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        this.pushSubscription = existing;
        return existing;
      }

      const response = await enhancedApi.request(`${this.baseUrl}/vapid-key`);
      const { publicKey } = await response.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to any to satisfy TS mismatch between DOM lib versions
        applicationServerKey: this.urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });

      await enhancedApi.request(`${this.baseUrl}/subscribe`, {
        method: 'POST',
        body: JSON.stringify(subscription),
      });

      this.pushSubscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  async unsubscribeFromPush(): Promise<boolean> {
    try {
      if (this.pushSubscription) {
        await this.pushSubscription.unsubscribe();
        
        // Notify server
        await enhancedApi.request(`${this.baseUrl}/unsubscribe`, {
          method: 'POST',
          body: JSON.stringify({ endpoint: this.pushSubscription.endpoint }),
        });
        
        this.pushSubscription = null;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    // Normalize URL-safe base64
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(normalized);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  // In-app Notifications
  async getNotifications(page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<{
    notifications: PushNotification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (unreadOnly) {
        params.append('unreadOnly', 'true');
      }

      const response = await enhancedApi.request(`${this.baseUrl}?${params.toString()}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await enhancedApi.request(`${this.baseUrl}/${notificationId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await enhancedApi.request(`${this.baseUrl}/read-all`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await enhancedApi.request(`${this.baseUrl}/${notificationId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await enhancedApi.request(`${this.baseUrl}/unread-count`);
      const { count } = await response.json();
      return count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Email Notifications
  async sendEmail(to: string, template: string, data: Record<string, any>): Promise<EmailNotification> {
    try {
      const response = await enhancedApi.request(`${this.baseUrl}/email`, {
        method: 'POST',
        body: JSON.stringify({ to, template, data }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async getEmailHistory(page: number = 1, limit: number = 20): Promise<{
    emails: EmailNotification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await enhancedApi.request(`${this.baseUrl}/email-history?${params.toString()}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching email history:', error);
      throw error;
    }
  }

  // Notification Preferences
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await enhancedApi.request(`${this.baseUrl}/preferences`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  async updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    try {
      const response = await enhancedApi.request(`${this.baseUrl}/preferences`, {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Real-time notifications
  setupRealTimeNotifications(
    onNewNotification: (notification: PushNotification) => void,
  onNotificationUpdated: (notification: PushNotification) => void,
  onNotificationDeleted?: (id: string) => void
  ): WebSocket | null {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const wsUrl = `${API_ROUTES.WEBSOCKET}?token=${token}&type=notifications`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Notifications WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'NEW_NOTIFICATION':
              onNewNotification(data.payload.notification);
              // Show browser notification if permission granted
              if (Notification.permission === 'granted') {
                new Notification(data.payload.notification.title, {
                  body: data.payload.notification.message,
                  icon: '/favicon-32x32.png',
                  tag: data.payload.notification.id,
                });
              }
              break;
            case 'NOTIFICATION_UPDATED':
              onNotificationUpdated(data.payload.notification);
              break;
            case 'NOTIFICATION_DELETED':
              if (onNotificationDeleted) {
                onNotificationDeleted(data.payload.id);
              }
              break;
            default:
              console.log('Unknown notification type:', data.type);
          }
        } catch (error) {
          console.error('Error processing notification WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Notifications WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('Notifications WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect after 3 seconds
        if (event.code !== 1000) { // Not a normal closure
          setTimeout(() => {
            console.log('Attempting to reconnect notifications WebSocket...');
            this.setupRealTimeNotifications(onNewNotification, onNotificationUpdated, onNotificationDeleted);
          }, 3000);
        }
      };

      return ws;
    } catch (error) {
      console.error('Error setting up real-time notifications:', error);
      return null;
    }
  }

  // Local notifications (fallback)
  showLocalNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon-32x32.png',
        badge: '/favicon-16x16.png',
      });
    } else {
      // Fallback to console log or custom in-app notification
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    }
  }
}

export const notificationService = new NotificationService();