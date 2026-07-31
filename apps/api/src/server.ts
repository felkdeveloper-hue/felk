import http from 'node:http';
import { createApp } from '@/app.js';
import { appConfig, connectDatabase, logger } from '@/config/index.js';
import { logStorageBackend } from '@/storage/index.js';
import { registerGracefulShutdown } from '@/utils/shutdown.js';
import {
  initOrderPaymentConsumer,
  catchUpUnconsumedPaymentEvents,
  catchUpOrphanCodPayments,
} from '@/services/order-payment-consumer.service.js';
import { startCronJobs } from '@/cron/index.js';
import { verifyEmailTransporter } from '@/services/email/transporter.js';
import { initAnalyticsLiveGateway } from '@/services/platform-analytics/live.gateway.js';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);
  initAnalyticsLiveGateway(server);

  // Start accepting connections before touching MongoDB. Index repairs plus
  // Atlas server selection can take tens of seconds on a cold instance, and
  // listening afterwards meant health checks and every storefront request hung
  // for that entire window instead of getting a fast response.
  server.listen(appConfig.server.port, appConfig.server.host, () => {
    logStorageBackend();
    logger.info(
      {
        host: appConfig.server.host,
        port: appConfig.server.port,
        prefix: appConfig.server.apiPrefix,
        docs: appConfig.server.docsPath,
        env: appConfig.app.env,
      },
      'API listening',
    );
  });

  registerGracefulShutdown(server);

  try {
    await connectDatabase();

    void verifyEmailTransporter();

    // Order Management subscribes to PaymentSucceeded in-process, then
    // catches up on anything published while no one was listening (e.g. a
    // previous crash or restart) — never verifies the payment itself.
    initOrderPaymentConsumer();
    startCronJobs();
    catchUpUnconsumedPaymentEvents()
      .then(({ scanned, created }) => {
        if (created > 0) {
          logger.info(
            { scanned, created },
            'Order catch-up: created orders from past payment events',
          );
        }
      })
      .catch((error) => {
        logger.error({ err: error }, 'Order catch-up scan failed');
      });
    catchUpOrphanCodPayments()
      .then(({ scanned, fulfilled }) => {
        if (fulfilled > 0) {
          logger.info(
            { scanned, fulfilled },
            'COD catch-up: created orders from orphan cash-on-delivery payments',
          );
        }
      })
      .catch((error) => {
        logger.error({ err: error }, 'COD catch-up scan failed');
      });
  } catch (error) {
    logger.warn({ err: error }, 'MongoDB unavailable — starting in degraded mode');
    const { databaseManager } = await import('@/config/database.js');
    databaseManager.startReconnectLoop();
  }
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start API');
  process.exit(1);
});
