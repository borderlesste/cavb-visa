"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetLimiter = exports.messageLimiter = exports.applicationLimiter = exports.apiLimiter = exports.uploadLimiter = exports.authLimiter = exports.globalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Global rate limiter for all endpoints
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Increased to 200 for better UX
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes',
            limit: 200,
            windowMs: 15 * 60 * 1000
        });
    }
});
// Strict authentication rate limiter
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Very restrictive for auth endpoints
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts, please try again later.',
            retryAfter: '15 minutes',
            limit: 5,
            windowMs: 15 * 60 * 1000
        });
    }
});
// File upload rate limiter
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        error: 'Too many file uploads, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many file uploads, please try again later.',
            retryAfter: '1 minute',
            limit: 10,
            windowMs: 60 * 1000
        });
    }
});
// API endpoint specific limiter
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Higher limit for authenticated API calls
    message: {
        error: 'API rate limit exceeded, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'API rate limit exceeded, please try again later.',
            retryAfter: '15 minutes',
            limit: 150,
            windowMs: 15 * 60 * 1000
        });
    }
});
// Application submission rate limiter (very restrictive)
exports.applicationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 application submissions per hour
    message: {
        error: 'Too many application submissions, please wait before creating a new one.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many application submissions, please wait before creating a new one.',
            retryAfter: '1 hour',
            limit: 3,
            windowMs: 60 * 60 * 1000
        });
    }
});
// Messaging system rate limiter
exports.messageLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 messages per 5 minutes
    message: {
        error: 'Too many messages sent, please wait before sending more.',
        retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many messages sent, please wait before sending more.',
            retryAfter: '5 minutes',
            limit: 20,
            windowMs: 5 * 60 * 1000
        });
    }
});
// Password reset rate limiter
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 password reset attempts per hour
    message: {
        error: 'Too many password reset attempts, please try again later.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many password reset attempts, please try again later.',
            retryAfter: '1 hour',
            limit: 3,
            windowMs: 60 * 60 * 1000
        });
    }
});
