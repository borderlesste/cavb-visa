import { Router } from 'express';
import { registerUser, loginUser, getMe, verifyEmail, resendVerificationEmail } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply strict authentication rate limiting
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/me', protect, getMe);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', passwordResetLimiter, resendVerificationEmail);

export default router;