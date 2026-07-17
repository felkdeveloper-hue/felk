import type { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';

morgan.token('request-id', (req: Request) => req.requestId || '-');

const stream = {
  write(message: string) {
    logger.info(message.trim());
  },
};

/**
 * HTTP access logger (Morgan → Pino).
 */
export const requestLoggerMiddleware = appConfig.app.isProd
  ? morgan(
      ':remote-addr :method :url :status :res[content-length] - :response-time ms rid=:request-id',
      { stream },
    )
  : morgan(appConfig.logging.morganFormat, { stream });

/** Optional lightweight structured logger */
export function structuredRequestLogger(req: Request, _res: Response, next: NextFunction): void {
  logger.debug(
    {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    'incoming request',
  );
  next();
}
