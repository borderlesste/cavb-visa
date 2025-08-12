"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Apply strict authentication rate limiting
router.post('/register', rateLimiter_1.authLimiter, authController_1.registerUser);
router.post('/login', rateLimiter_1.authLimiter, authController_1.loginUser);
router.get('/me', authMiddleware_1.protect, authController_1.getMe);
router.get('/verify-email/:token', authController_1.verifyEmail);
router.post('/resend-verification', rateLimiter_1.passwordResetLimiter, authController_1.resendVerificationEmail);
exports.default = router;
