"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.updatePreferences = exports.getPreferences = exports.getEmailHistory = exports.sendEmail = exports.getUnreadCount = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = exports.unsubscribeFromPush = exports.subscribeToPush = exports.getVapidKey = void 0;
exports.createNotification = createNotification;
const web_push_1 = __importDefault(require("web-push"));
const emailService_1 = require("../services/emailService");
const db = __importStar(require("../db"));
const webSocketService_1 = require("../services/webSocketService");
// Helper to insert a notification (used potentially by other services)
async function createNotification(params) {
    const { userId, title, message, type = 'info', applicationId = null } = params;
    const id = crypto.randomUUID();
    await db.query(`INSERT INTO notifications (id, user_id, title, message, type, application_id) VALUES (?, ?, ?, ?, ?, ?)`, [id, userId, title, message, type, applicationId]);
    const notification = { id, user_id: userId, title, message, type, application_id: applicationId, is_read: 0, created_at: new Date().toISOString() };
    // Real-time push via WebSocket
    (0, webSocketService_1.sendNotificationToUser)(userId, {
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
        web_push_1.default.setVapidDetails('mailto:admin@cavb-visa.iom.org', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    }
    catch (error) {
        console.warn('VAPID keys not configured properly. Push notifications will not work.', error);
    }
}
else {
    console.warn('VAPID keys not provided. Push notifications will not work. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
}
// Get VAPID public key
const getVapidKey = async (req, res) => {
    try {
        res.json({
            publicKey: process.env.VAPID_PUBLIC_KEY || 'BMqSvZe-JHhG7HHtBcP3nGNKb3ELhbFNGWKBOqKCKRdlL-I8bNwKmO5N7rrfkYzWjXc8NpK9WjNt8KKbG9QhCg8'
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error getting VAPID key' });
    }
};
exports.getVapidKey = getVapidKey;
// Subscribe to push notifications
const subscribeToPush = async (req, res) => {
    try {
        const subscription = req.body;
        const userId = req.user?.id;
        // In production, save subscription to database
        console.log('Push subscription for user:', userId, subscription);
        res.status(201).json({ message: 'Subscription saved successfully' });
    }
    catch (error) {
        console.error('Error subscribing to push notifications:', error);
        res.status(500).json({ message: 'Error subscribing to push notifications' });
    }
};
exports.subscribeToPush = subscribeToPush;
// Unsubscribe from push notifications
const unsubscribeFromPush = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user?.id;
        // In production, remove subscription from database
        console.log('Unsubscribing user:', userId, 'from endpoint:', endpoint);
        res.json({ message: 'Unsubscribed successfully' });
    }
    catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        res.status(500).json({ message: 'Error unsubscribing from push notifications' });
    }
};
exports.unsubscribeFromPush = unsubscribeFromPush;
// Get notifications
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const unreadOnly = req.query.unreadOnly === 'true';
        const offset = (page - 1) * limit;
        let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
        const params = [userId];
        if (unreadOnly) {
            query += ' AND is_read = false';
        }
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const result = await db.query(query, params);
        // Get total count
        let countQuery = `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?`;
        const countParams = [userId];
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
    }
    catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ message: 'Error getting notifications' });
    }
};
exports.getNotifications = getNotifications;
// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user?.id;
        await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notificationId, userId]);
        const updated = await db.query('SELECT id, title, message, type, is_read, created_at, application_id FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
        if (updated.rows.length > 0) {
            (0, webSocketService_1.sendNotificationUpdateToUser)(userId, updated.rows[0]);
        }
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error marking notification as read' });
    }
};
exports.markAsRead = markAsRead;
// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
        // Optionally send a summary event; fetch last 10 updated for client refresh
        const recent = await db.query('SELECT id, title, message, type, is_read, created_at, application_id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);
        recent.rows.forEach(n => (0, webSocketService_1.sendNotificationUpdateToUser)(userId, n));
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error marking all notifications as read' });
    }
};
exports.markAllAsRead = markAllAsRead;
// Delete notification
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user?.id;
        const result = await db.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
        if (result.rows) { /* query wrapper returns {rows}; deletions not reflected here */ }
        (0, webSocketService_1.sendNotificationDeletedToUser)(userId, notificationId);
        res.json({ message: 'Notification deleted' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Error deleting notification' });
    }
};
exports.deleteNotification = deleteNotification;
// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user?.id;
        const result = await db.query('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
        res.json({ count: result.rows[0].cnt });
    }
    catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ message: 'Error getting unread count' });
    }
};
exports.getUnreadCount = getUnreadCount;
// Send email notification
const sendEmail = async (req, res) => {
    try {
        const { to, template, data } = req.body;
        // Minimal placeholder: send a generic email when template provided
        if (template === 'verify' && data?.token && data?.fullName) {
            await (0, emailService_1.sendVerificationEmail)(to, data.token, data.fullName);
        }
        res.json({
            id: Date.now().toString(),
            to,
            template,
            data,
            status: 'SENT',
            sentAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            message: 'Error sending email',
            error: error.message
        });
    }
};
exports.sendEmail = sendEmail;
// Get email history
const getEmailHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        // Mock email history
        const mockEmails = [
            {
                id: '1',
                to: req.user?.email || 'user@example.com',
                subject: 'Application Update',
                template: 'application_update',
                status: 'SENT',
                sentAt: new Date().toISOString(),
            },
            {
                id: '2',
                to: req.user?.email || 'user@example.com',
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
    }
    catch (error) {
        console.error('Error getting email history:', error);
        res.status(500).json({ message: 'Error getting email history' });
    }
};
exports.getEmailHistory = getEmailHistory;
// Get notification preferences
const getPreferences = async (req, res) => {
    try {
        // In production, get from database
        res.json(mockPreferences);
    }
    catch (error) {
        console.error('Error getting preferences:', error);
        res.status(500).json({ message: 'Error getting preferences' });
    }
};
exports.getPreferences = getPreferences;
// Update notification preferences
const updatePreferences = async (req, res) => {
    try {
        const preferences = req.body;
        // In production, save to database
        Object.assign(mockPreferences, preferences);
        res.json(mockPreferences);
    }
    catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ message: 'Error updating preferences' });
    }
};
exports.updatePreferences = updatePreferences;
// Helper function to send push notification
const sendPushNotification = async (subscription, payload) => {
    try {
        await web_push_1.default.sendNotification(subscription, JSON.stringify(payload));
        console.log('Push notification sent successfully');
    }
    catch (error) {
        console.error('Error sending push notification:', error);
    }
};
exports.sendPushNotification = sendPushNotification;
