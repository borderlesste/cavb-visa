
import { Router } from 'express';
import authRouter from './auth';
import applicationRouter from './application';
import adminRouter from './admin';
import notificationsRouter from './notifications';
import messagesRouter from './messages';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply API-specific rate limiting to all API routes
router.use(apiLimiter);

router.use('/auth', authRouter);
router.use('/applications', applicationRouter);
router.use('/admin', adminRouter);
router.use('/notifications', notificationsRouter);
router.use('/messages', messagesRouter);

export default router;