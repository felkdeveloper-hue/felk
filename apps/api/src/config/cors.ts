import type { CorsOptions } from 'cors';
import { appConfig } from '@/config/app.config';
import { env } from '@/config/env';

function isAllowedOrigin(origin: string): boolean {
  if (appConfig.cors.origins.includes(origin)) return true;

  // Local tunnels (ngrok / cloudflared) change host each session — allow in non-prod only.
  if (!env.isProd) {
    try {
      const host = new URL(origin).hostname;
      return (
        host.endsWith('.ngrok-free.dev') ||
        host.endsWith('.ngrok-free.app') ||
        host.endsWith('.ngrok.app') ||
        host.endsWith('.ngrok.io') ||
        host.endsWith('.loca.lt') ||
        host.endsWith('.trycloudflare.com')
      );
    } catch {
      return false;
    }
  }

  return false;
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
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
