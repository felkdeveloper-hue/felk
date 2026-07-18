import type { CorsOptions } from 'cors';
import { appConfig } from '@/config/app.config';

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || appConfig.cors.origins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: appConfig.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-CSRF-Token',
    'Idempotency-Key',
    'x-guest-cart-token',
  ],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  maxAge: 86_400,
};
