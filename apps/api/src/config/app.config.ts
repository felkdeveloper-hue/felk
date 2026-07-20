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
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  },
  storage: {
    r2: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      accountId: env.R2_ACCOUNT_ID,
      bucket: env.R2_BUCKET_NAME,
      endpoint:
        env.R2_ENDPOINT ||
        (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
      publicUrl: env.R2_PUBLIC_URL || env.CDN_BASE_URL || undefined,
      enabled: Boolean(
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_BUCKET_NAME &&
        (env.R2_ENDPOINT || env.R2_ACCOUNT_ID),
      ),
    },
    s3: {
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      bucket: env.AWS_S3_BUCKET,
      endpoint: env.AWS_S3_ENDPOINT,
      publicUrl: env.S3_PUBLIC_URL || env.CDN_BASE_URL,
      enabled: Boolean(
        env.AWS_ACCESS_KEY_ID &&
        env.AWS_SECRET_ACCESS_KEY &&
        env.AWS_S3_BUCKET &&
        (env.S3_PUBLIC_URL || env.CDN_BASE_URL),
      ),
    },
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
    },
    mintpay: {
      merchantId: env.MINTPAY_MERCHANT_ID,
      secretKey: env.MINTPAY_SECRET_KEY,
    },
    cod: {
      webhookSecret: env.COD_WEBHOOK_SECRET,
    },
  },
} as const;

export type AppConfig = typeof appConfig;
