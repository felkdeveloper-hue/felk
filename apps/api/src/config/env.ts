import { config as loadDotenv } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(configDir, '../../../..');

// Root .env first, then app-specific overrides.
loadDotenv({ path: join(repoRoot, '.env') });
loadDotenv({ path: join(repoRoot, 'apps/api/.env'), override: true });

const DEV_SECRETS = [
  'dev-access-secret-change-me!!',
  'dev-refresh-secret-change-me!',
  'dev-cookie-secret-change-me!!!',
  'dev-payhere-merchant-secret',
  'dev-koko-secret-key',
  'dev-mintpay-secret-key',
  'dev-cod-webhook-secret',
] as const;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    APP_NAME: z.string().min(1).default('fe-platform'),
    APP_VERSION: z.string().default('0.1.0'),
    API_PREFIX: z.string().default('/api/v1'),
    API_DOCS_PATH: z.string().default('/api/docs'),
    SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
    MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/fe-platform'),
    MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(10),
    JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me!!'),
    JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me!'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    COOKIE_SECRET: z.string().min(16).default('dev-cookie-secret-change-me!!!'),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    CSRF_ENABLED: z.enum(['true', 'false']).optional(),
    METRICS_ENABLED: z.enum(['true', 'false']).optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('debug'),
    MORGAN_FORMAT: z.string().default('dev'),
    UPLOAD_MAX_SIZE_MB: z.coerce.number().positive().default(10),
    UPLOAD_ALLOWED_MIME: z.string().default('image/jpeg,image/png,image/webp,image/avif'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('FE Platform <noreply@feplatform.com>'),
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    S3_PUBLIC_URL: z.string().optional(),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

    PAYMENT_RETURN_URL: z.string().default('http://localhost:5173/payment/return'),
    PAYMENT_CANCEL_URL: z.string().default('http://localhost:5173/payment/cancel'),
    PAYMENT_ATTEMPT_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    PAYMENT_MAX_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(5),

    PAYHERE_MERCHANT_ID: z.string().default('dev-payhere-merchant-id'),
    PAYHERE_MERCHANT_SECRET: z.string().default('dev-payhere-merchant-secret'),
    PAYHERE_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

    KOKO_MERCHANT_ID: z.string().default('dev-koko-merchant-id'),
    KOKO_SECRET_KEY: z.string().default('dev-koko-secret-key'),
    KOKO_API_KEY: z.string().optional(),
    KOKO_PRIVATE_KEY_PATH: z.string().default('config/koko_private.pem'),

    MINTPAY_MERCHANT_ID: z.string().default('dev-mintpay-merchant-id'),
    MINTPAY_SECRET_KEY: z.string().default('dev-mintpay-secret-key'),
    MINTPAY_MERCHANT_SECRET: z.string().optional(),
    MINTPAY_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

    COD_WEBHOOK_SECRET: z.string().default('dev-cod-webhook-secret'),

    META_CAPI_TOKEN: z.string().optional(),
    META_PIXEL_ID: z.string().optional(),

    TIKTOK_PIXEL_ID: z.string().optional(),
    TIKTOK_ACCESS_TOKEN: z.string().optional(),

    SMTP_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    FROM_EMAIL: z.string().optional(),
    FROM_NAME: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const strictProduction =
      data.NODE_ENV === 'production' && process.env.PRODUCTION_STRICT !== 'false';

    if (!strictProduction) return;

    const secrets = [
      { key: 'JWT_ACCESS_SECRET', value: data.JWT_ACCESS_SECRET },
      { key: 'COOKIE_SECRET', value: data.COOKIE_SECRET },
      { key: 'PAYHERE_MERCHANT_SECRET', value: data.PAYHERE_MERCHANT_SECRET },
      { key: 'KOKO_SECRET_KEY', value: data.KOKO_SECRET_KEY },
      { key: 'MINTPAY_SECRET_KEY', value: data.MINTPAY_SECRET_KEY },
      { key: 'COD_WEBHOOK_SECRET', value: data.COD_WEBHOOK_SECRET },
    ];

    for (const secret of secrets) {
      if (DEV_SECRETS.includes(secret.value as (typeof DEV_SECRETS)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${secret.key} must be changed from the development default in production`,
          path: [secret.key],
        });
      }
    }

    if (!data.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'COOKIE_SECURE must be true in production',
        path: ['COOKIE_SECURE'],
      });
    }

    if (data.CORS_ORIGINS.includes('localhost')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGINS must not include localhost in production',
        path: ['CORS_ORIGINS'],
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

const isProd = data.NODE_ENV === 'production';
const isDev = data.NODE_ENV === 'development';
const isTest = data.NODE_ENV === 'test';

/**
 * Validated environment configuration (single source of truth).
 */
export const env = {
  ...data,
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadAllowedMimeTypes: data.UPLOAD_ALLOWED_MIME.split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  swaggerEnabled:
    data.SWAGGER_ENABLED === undefined ? isDev && !isTest : data.SWAGGER_ENABLED === 'true',
  metricsEnabled: data.METRICS_ENABLED === undefined ? true : data.METRICS_ENABLED === 'true',
  csrfEnabled: data.CSRF_ENABLED === 'true',
  logLevel: isProd && data.LOG_LEVEL === 'debug' ? 'info' : data.LOG_LEVEL,
  smtpEnabled:
    data.SMTP_ENABLED !== undefined
      ? data.SMTP_ENABLED
      : Boolean(data.SMTP_HOST && data.SMTP_USER && data.SMTP_PASS),
  isDev,
  isProd,
  isTest,
} as const;

export type Env = typeof env;
