import http from 'node:http';
import { createApp } from '@/app';
import { appConfig, connectDatabase, logger } from '@/config';
import { registerGracefulShutdown } from '@/utils/shutdown';
import {
  initOrderPaymentConsumer,
  catchUpUnconsumedPaymentEvents,
} from '@/services/order-payment-consumer.service';
import { startCronJobs } from '@/cron';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const server = http.createServer(app);

  try {
    await connectDatabase();

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
  } catch (error) {
    logger.warn({ err: error }, 'MongoDB unavailable — starting in degraded mode');
  }

  server.listen(appConfig.server.port, appConfig.server.host, () => {
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
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start API');
  process.exit(1);
});
