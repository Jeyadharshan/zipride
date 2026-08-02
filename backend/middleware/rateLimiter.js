// backend/middleware/rateLimiter.js
// Route-specific rate limiters: different limits for auth, OTP, rides, payments, admin.

import rateLimit from 'express-rate-limit';

const makeLimit = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
      data: null,
      errors: [{ code: 'RATE_LIMIT_EXCEEDED', message }],
    },
  });

// Auth: 500 login attempts per 15 minutes
export const loginLimiter = makeLimit(
  15, 500,
  'Too many login attempts. Please wait 15 minutes before trying again.'
);

// OTP: 500 OTP requests per 10 minutes
export const otpLimiter = makeLimit(
  10, 500,
  'Too many OTP requests. Please wait before requesting another code.'
);

// Ride booking: 1000 requests per 5 minutes
export const rideLimiter = makeLimit(
  5, 1000,
  'Too many ride requests. Please slow down.'
);

// Payments: 500 requests per 10 minutes
export const paymentLimiter = makeLimit(
  10, 500,
  'Too many payment requests. Please try again later.'
);

// Admin APIs: 10000 requests per 15 minutes
export const adminLimiter = makeLimit(
  15, 10000,
  'Admin rate limit reached. Please try again shortly.'
);

// General API limit (fallback): 10000 per 15 minutes
export const generalLimiter = makeLimit(
  15, 10000,
  'Too many requests. Please try again later.'
);
