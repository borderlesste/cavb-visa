"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// All notification routes are protected
router.use(authMiddleware_1.protect);
// Push notification routes
router.get('/vapid-key', notificationController_1.getVapidKey);
router.post('/subscribe', notificationController_1.subscribeToPush);
router.post('/unsubscribe', notificationController_1.unsubscribeFromPush);
// In-app notification routes
router.get('/', notificationController_1.getNotifications);
router.get('/unread-count', notificationController_1.getUnreadCount);
router.put('/:notificationId/read', notificationController_1.markAsRead);
router.put('/read-all', notificationController_1.markAllAsRead);
router.delete('/:notificationId', notificationController_1.deleteNotification);
// Email notification routes
router.post('/email', rateLimiter_1.messageLimiter, notificationController_1.sendEmail);
router.get('/email-history', notificationController_1.getEmailHistory);
// Preference routes
router.get('/preferences', notificationController_1.getPreferences);
router.put('/preferences', notificationController_1.updatePreferences);
exports.default = router;
