import rateLimit from 'express-rate-limit';
import { appConfig } from '@/config/app.config';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { HTTP_STATUS } from '@/constants/http';

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
});
