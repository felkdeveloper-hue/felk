import { appConfig } from '@/config/app.config';
import { databaseManager } from '@/config/database';
import { HTTP_STATUS } from '@/constants/http';
import { ApiResponse } from '@/utils/response/api-response';
import { asyncHandler } from '@/utils/async-handler';

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

    const ready = mongo.ok;
    const payload = {
      status: ready ? 'ready' : 'not_ready',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: appConfig.app.version,
      checks: {
        mongodb: mongo,
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
