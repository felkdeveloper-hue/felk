import rateLimit from 'express-rate-limit';
import { appConfig } from '@/config/app.config.js';
import { AUTH_LIMITS } from '@/constants/auth.js';
import { ERROR_MESSAGES } from '@/constants/error-messages.js';
import { HTTP_STATUS } from '@/constants/http.js';

const skipLocalNoise = () => appConfig.app.isTest || appConfig.app.isDev;

/**
 * Global API rate limiter (in-memory). Skipped in development/test.
 */
export const globalRateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalNoise,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: ERROR_MESSAGES.RATE_LIMITED,
    },
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

/** Max 3 OTP send/resend requests per 15 minutes (per IP). */
export const otpRateLimiter = rateLimit({
  windowMs: AUTH_LIMITS.OTP_RATE_LIMIT_WINDOW_MS,
  max: AUTH_LIMITS.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalNoise,
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMITED',
      message: 'Too many verification code requests. Please try again later.',
    },
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipLocalNoise,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: ERROR_MESSAGES.RATE_LIMITED,
    },
  },
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});
