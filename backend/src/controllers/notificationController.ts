import { Request, Response } from 'express';
import webpush from 'web-push';
import { sendVerificationEmail } from '../services/emailService';
import * as db from '../db';
import { sendNotificationToUser, sendNotificationUpdateToUser, sendNotificationDeletedToUser } from '../services/webSocketService';

// Helper to insert a notification (used potentially by other services)
export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error' | 'system';
  applicationId?: string | null;
}) {
  const { userId, title, message, type = 'info', applicationId = null } = params;
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO notifications (id, user_id, title, message, type, application_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, title, message, type, applicationId]
  );
  const notification = { id, user_id: userId, title, message, type, application_id: applicationId, is_read: 0, created_at: new Date().toISOString() };
  // Real-time push via WebSocket
  sendNotificationToUser(userId, {
    id,
    title,
    message,
    type,
    is_read: 0,
    created_at: notification.created_at,
    application_id: applicationId
  });
  return id;
}

const mockPreferences = {
  email: {
    applicationUpdates: true,
    documentRequests: true,
    appointmentReminders: true,
    systemAnnouncements: false,
  },
  push: {
    applicationUpdates: true,
    documentRequests: true,
    appointmentReminders: true,
    systemAnnouncements: false,
  },
};

// Configure web-push - only if valid keys are provided
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:admin@cavb-visa.iom.org',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (error) {
    console.warn('VAPID keys not configured properly. Push notifications will not work.', error);
  }
} else {
  console.warn('VAPID keys not provided. Push notifications will not work. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
}

// Get VAPID public key
export const getVapidKey = async (req: Request, res: Response) => {
  try {
    res.json({ 
      publicKey: process.env.VAPID_PUBLIC_KEY || 'BMqSvZe-JHhG7HHtBcP3nGNKb3ELhbFNGWKBOqKCKRdlL-I8bNwKmO5N7rrfkYzWjXc8NpK9WjNt8KKbG9QhCg8'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting VAPID key' });
  }
};

// Subscribe to push notifications
export const subscribeToPush = async (req: Request, res: Response) => {
  try {
  const subscription = req.body;
  const userId = req.user?.id as string;
    
    // In production, save subscription to database
    console.log('Push subscription for user:', userId, subscription);
    
    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ message: 'Error subscribing to push notifications' });
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (req: Request, res: Response) => {
  try {
  const { endpoint } = req.body;
  const userId = req.user?.id as string;
    
    // In production, remove subscription from database
    console.log('Unsubscribing user:', userId, 'from endpoint:', endpoint);
    
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ message: 'Error unsubscribing from push notifications' });
  }
};

// Get notifications
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    const params: any[] = [userId];
    
    if (unreadOnly) {
      query += ' AND is_read = false';
    }
    
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
  let countQuery = `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?`;
  const countParams: any[] = [userId];
    if (unreadOnly) {
      countQuery += ' AND is_read = false';
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      notifications: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: 'Error getting notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
  const { notificationId } = req.params;
  const userId = req.user?.id as string;
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId]);
    const updated = await db.query('SELECT id, title, message, type, is_read, created_at, application_id FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
    if (updated.rows.length > 0) {
      sendNotificationUpdateToUser(userId, updated.rows[0]);
    }
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
  const userId = req.user?.id as string;
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
  // Optionally send a summary event; fetch last 10 updated for client refresh
  const recent = await db.query('SELECT id, title, message, type, is_read, created_at, application_id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);
  recent.rows.forEach(n => sendNotificationUpdateToUser(userId, n));
  res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
};

// Delete notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id as string;
  const result = await db.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
  if (result.rows) { /* query wrapper returns {rows}; deletions not reflected here */ }
  sendNotificationDeletedToUser(userId, notificationId);
  res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
};

// Get unread count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
  const userId = req.user?.id as string;
  const result = await db.query('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  res.json({ count: result.rows[0].cnt });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Error getting unread count' });
  }
};

// Send email notification
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { to, template, data } = req.body;
    
    // Minimal placeholder: send a generic email when template provided
    if (template === 'verify' && data?.token && data?.fullName) {
      await sendVerificationEmail(to, data.token, data.fullName);
    }
    
    res.json({
      id: Date.now().toString(),
      to,
      template,
      data,
      status: 'SENT',
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      message: 'Error sending email',
  error: (error as Error).message 
    });
  }
};

// Get email history
export const getEmailHistory = async (req: Request, res: Response) => {
  try {
  const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    // Mock email history
    const mockEmails = [
      {
        id: '1',
        to: (req.user as any)?.email || 'user@example.com',
        subject: 'Application Update',
        template: 'application_update',
        status: 'SENT',
        sentAt: new Date().toISOString(),
      },
      {
        id: '2',
        to: (req.user as any)?.email || 'user@example.com',
        subject: 'Document Required',
        template: 'document_required',
        status: 'SENT',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    
    const total = mockEmails.length;
    const startIndex = (page - 1) * limit;
    const emails = mockEmails.slice(startIndex, startIndex + limit);
    
    res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error getting email history:', error);
    res.status(500).json({ message: 'Error getting email history' });
  }
};

// Get notification preferences
export const getPreferences = async (req: Request, res: Response) => {
  try {
    // In production, get from database
    res.json(mockPreferences);
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ message: 'Error getting preferences' });
  }
};

// Update notification preferences
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const preferences = req.body;
    
    // In production, save to database
    Object.assign(mockPreferences, preferences);
    
    res.json(mockPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Error updating preferences' });
  }
};

// Helper function to send push notification
export const sendPushNotification = async (
  subscription: any, 
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};