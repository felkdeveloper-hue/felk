import { env } from '@/config/env';

/**
 * Typed application configuration derived from environment.
 * Prefer importing `appConfig` over reading raw `env` in feature code.
 */
export const appConfig = {
  app: {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    env: env.NODE_ENV,
    isDev: env.isDev,
    isProd: env.isProd,
    isTest: env.isTest,
  },
  server: {
    host: env.HOST,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    docsPath: env.API_DOCS_PATH,
    shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    trustProxy: env.TRUST_PROXY,
  },
  security: {
    csrfEnabled: env.csrfEnabled,
    swaggerEnabled: env.swaggerEnabled,
  },
  features: {
    metricsEnabled: env.metricsEnabled,
  },
  cors: {
    origins: env.corsOrigins,
    credentials: true,
  },
  database: {
    uri: env.MONGODB_URI,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
  },
  auth: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  cookie: {
    secret: env.COOKIE_SECRET,
    secure: env.COOKIE_SECURE || env.isProd,
    sameSite: env.COOKIE_SAME_SITE,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  logging: {
    level: env.logLevel,
    morganFormat: env.MORGAN_FORMAT,
  },
  upload: {
    maxSizeMb: env.UPLOAD_MAX_SIZE_MB,
    maxSizeBytes: Math.floor(env.UPLOAD_MAX_SIZE_MB * 1024 * 1024),
    allowedMimeTypes: env.uploadAllowedMimeTypes,
  },
  email: {
    enabled: env.smtpEnabled,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
    fromEmail: env.FROM_EMAIL ?? env.EMAIL_FROM,
    fromName: env.FROM_NAME ?? 'Fashion Edge',
  },
  storage: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    bucket: env.AWS_S3_BUCKET,
    publicUrl: env.S3_PUBLIC_URL,
  },
  payment: {
    returnUrl: env.PAYMENT_RETURN_URL,
    cancelUrl: env.PAYMENT_CANCEL_URL,
    attemptTtlMinutes: env.PAYMENT_ATTEMPT_TTL_MINUTES,
    maxRetryAttempts: env.PAYMENT_MAX_RETRY_ATTEMPTS,
    payhere: {
      merchantId: env.PAYHERE_MERCHANT_ID,
      merchantSecret: env.PAYHERE_MERCHANT_SECRET,
      mode: env.PAYHERE_MODE,
    },
    koko: {
      merchantId: env.KOKO_MERCHANT_ID,
      secretKey: env.KOKO_SECRET_KEY,
      apiKey: env.KOKO_API_KEY,
      privateKeyPath: env.KOKO_PRIVATE_KEY_PATH,
    },
    mintpay: {
      merchantId: env.MINTPAY_MERCHANT_ID,
      secretKey: env.MINTPAY_MERCHANT_SECRET ?? env.MINTPAY_SECRET_KEY,
      mode: env.MINTPAY_MODE,
    },
    cod: {
      webhookSecret: env.COD_WEBHOOK_SECRET,
    },
  },
  analytics: {
    meta: {
      token: env.META_CAPI_TOKEN,
      pixelId: env.META_PIXEL_ID,
      configured: Boolean(env.META_CAPI_TOKEN && env.META_PIXEL_ID),
    },
    tiktok: {
      pixelId: env.TIKTOK_PIXEL_ID,
      accessToken: env.TIKTOK_ACCESS_TOKEN,
      configured: Boolean(env.TIKTOK_PIXEL_ID && env.TIKTOK_ACCESS_TOKEN),
    },
  },
} as const;

export type AppConfig = typeof appConfig;
