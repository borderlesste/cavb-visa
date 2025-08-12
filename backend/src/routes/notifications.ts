import { Router } from 'express';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  getUnreadCount,
  subscribeToPush,
  unsubscribeFromPush,
  getVapidKey,
  sendEmail,
  getEmailHistory,
  getPreferences,
  updatePreferences
} from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';
import { messageLimiter } from '../middleware/rateLimiter';

const router = Router();

// All notification routes are protected
router.use(protect);

// Push notification routes
router.get('/vapid-key', getVapidKey);
router.post('/subscribe', subscribeToPush);
router.post('/unsubscribe', unsubscribeFromPush);

// In-app notification routes
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:notificationId/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:notificationId', deleteNotification);

// Email notification routes
router.post('/email', messageLimiter, sendEmail);
router.get('/email-history', getEmailHistory);

// Preference routes
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;