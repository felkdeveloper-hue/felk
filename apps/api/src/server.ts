import http from 'node:http';
import { createApp } from '@/app.js';
import { appConfig, connectDatabase, logger } from '@/config/index.js';
import { logStorageBackend } from '@/storage/index.js';
import { registerGracefulShutdown } from '@/utils/shutdown.js';
import {
  initOrderPaymentConsumer,
  catchUpUnconsumedPaymentEvents,
  catchUpOrphanCodPayments,
  catchUpOrphanPaidGatewayPayments,
  recoverConfirmedMintpayOrders,
  recoverConfirmedKokoOrders,
  voidUnverifiedKokoAutoOrders,
} from '@/services/order-payment-consumer.service.js';
import { startCronJobs } from '@/cron/index.js';
import { resetEmailTransporter, verifyEmailTransporter } from '@/services/email/transporter.js';
import { initAnalyticsLiveGateway } from '@/services/platform-analytics/live.gateway.js';

/** Tell PM2 (wait_ready) this worker can receive traffic — after Mongo is up. */
function notifyProcessManagerReady(): void {
  if (typeof process.send === 'function') {
    process.send('ready');
    logger.info('Signaled process manager: ready');
  }
}

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
    notifyProcessManagerReady();

    // Verify SMTP, then drop the socket — Titan often fails the next send if we keep it.
    void verifyEmailTransporter().finally(() => {
      resetEmailTransporter();
    });

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
    recoverConfirmedMintpayOrders()
      .then(({ scanned, recovered }) => {
        const created = recovered.filter((row) => row.orderNumber);
        if (created.length > 0) {
          logger.info(
            {
              scanned,
              created: created.length,
              orders: created.map((row) => ({
                referenceNumber: row.referenceNumber,
                orderNumber: row.orderNumber,
                itemCount: row.items.length,
                amount: row.amount,
              })),
            },
            'Mintpay recovery: created missing orders from confirmed purchases',
          );
        }
      })
      .catch((error) => {
        logger.error({ err: error }, 'Mintpay confirmed-order recovery failed');
      });
    voidUnverifiedKokoAutoOrders()
      .then(async (voided) => {
        if (voided.voided.length > 0) {
          logger.warn(
            { voided: voided.voided },
            'Koko: cancelled admin orders that were not captured by Paykoko',
          );
        }
        const orphan = await catchUpOrphanPaidGatewayPayments();
        if (orphan.created > 0) {
          logger.info(
            { scanned: orphan.scanned, created: orphan.created },
            'Paid-gateway catch-up: created orders from verified payments',
          );
        }
        const koko = await recoverConfirmedKokoOrders();
        const created = koko.recovered.filter((row) => row.orderNumber);
        if (created.length > 0) {
          logger.info(
            {
              scanned: koko.scanned,
              created: created.length,
              orders: created.map((row) => ({
                referenceNumber: row.referenceNumber,
                orderNumber: row.orderNumber,
                itemCount: row.items.length,
                amount: row.amount,
              })),
            },
            'Koko recovery: created missing orders from captured Paykoko payments',
          );
        }
      })
      .catch((error) => {
        logger.error({ err: error }, 'Gateway payment/order sync failed');
      });
  } catch (error) {
    logger.warn({ err: error }, 'MongoDB unavailable — starting in degraded mode');
    const { databaseManager } = await import('@/config/database.js');
    // Delay PM2 ready until Mongo reconnects so reload does not cut over early.
    databaseManager.startReconnectLoop(15_000, () => notifyProcessManagerReady());
  }
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start API');
  process.exit(1);
});
