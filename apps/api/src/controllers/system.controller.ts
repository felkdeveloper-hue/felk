import { appConfig } from '@/config/app.config';
import { databaseManager } from '@/config/database';
import { HTTP_STATUS } from '@/constants/http';
import { ApiResponse } from '@/utils/response/api-response';
import { asyncHandler } from '@/utils/async-handler';
import { emailService } from '@/services/email.service';

const startedAt = Date.now();

export const healthController = {
  live: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: appConfig.app.version,
    });
  }),

  ready: asyncHandler(async (_req, res) => {
    const mongo = await databaseManager.healthCheck();

    // SMTP check is cheap (connection verify); gateway/analytics are config-presence only
    const smtpCheck = await (async () => {
      if (!appConfig.email.enabled) return { ok: false, reason: 'disabled' };
      const ok = await emailService.verifyConnection().catch(() => false);
      return { ok };
    })();

    const payhereCheck = {
      ok: Boolean(appConfig.payment.payhere.merchantId && appConfig.payment.payhere.merchantSecret),
      mode: appConfig.payment.payhere.mode,
    };
    const kokoCheck = {
      ok: Boolean(appConfig.payment.koko.merchantId),
      apiKeyConfigured: Boolean(appConfig.payment.koko.apiKey),
    };
    const mintpayCheck = {
      ok: Boolean(appConfig.payment.mintpay.merchantId),
      mode: appConfig.payment.mintpay.mode,
    };
    const metaCheck = {
      ok: appConfig.analytics.meta.configured,
    };
    const tiktokCheck = {
      ok: appConfig.analytics.tiktok.configured,
    };

    const ready = mongo.ok;
    const payload = {
      status: ready ? 'ready' : 'not_ready',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: appConfig.app.version,
      checks: {
        mongodb: mongo,
        smtp: smtpCheck,
        payhere: payhereCheck,
        koko: kokoCheck,
        mintpay: mintpayCheck,
        meta: metaCheck,
        tiktok: tiktokCheck,
      },
    };

    if (!ready) {
      ApiResponse.success(res, payload, 'Service not ready', HTTP_STATUS.SERVICE_UNAVAILABLE);
      return;
    }

    ApiResponse.success(res, payload, 'Service ready');
  }),

  metrics: asyncHandler(async (_req, res) => {
    if (!appConfig.features.metricsEnabled) {
      ApiResponse.success(res, { enabled: false });
      return;
    }

    const memory = process.memoryUsage();
    ApiResponse.success(res, {
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(startedAt).toISOString(),
      version: appConfig.app.version,
      node: process.version,
      pid: process.pid,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      cpu: process.cpuUsage(),
    });
  }),
};

export const versionController = {
  get: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, {
      name: appConfig.app.name,
      version: appConfig.app.version,
      api: 'v1',
      env: appConfig.app.env,
      docs: appConfig.security.swaggerEnabled ? appConfig.server.docsPath : null,
    });
  }),
};
