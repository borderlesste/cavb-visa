import rateLimit from 'express-rate-limit';

// Global rate limiter for all endpoints
export const globalLimiter = rateLimit({
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
export const authLimiter = rateLimit({
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
export const uploadLimiter = rateLimit({
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
export const apiLimiter = rateLimit({
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
export const applicationLimiter = rateLimit({
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
export const messageLimiter = rateLimit({
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
export const passwordResetLimiter = rateLimit({
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