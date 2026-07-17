import type { Server } from 'node:http';
import { appConfig } from '@/config/app.config';
import { disconnectDatabase } from '@/config/database';
import { logger } from '@/config/logger';
import { disconnectRedis } from '@/config/redis';

let isShuttingDown = false;

/**
 * Graceful shutdown — stop accepting traffic, close DB/Redis, exit.
 */
export function registerGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated');

    const forceTimer = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, appConfig.server.shutdownTimeoutMs);

    forceTimer.unref();

    server.close(async (closeError) => {
      if (closeError) {
        logger.error({ err: closeError }, 'Error closing HTTP server');
      }

      try {
        await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
        logger.info('Connections closed — exiting');
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, 'Error during shutdown cleanup');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    void shutdown('unhandledRejection');
  });
}
