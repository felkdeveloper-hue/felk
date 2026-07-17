import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { HTTP_STATUS } from '@/constants/http';
import { ApiError } from '@/utils/errors/api-error';
import { ApiResponse } from '@/utils/response/api-response';

function errorMeta(req: Request) {
  return {
    requestId: req.requestId,
    correlationId: req.context?.correlationId,
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId;
  const meta = errorMeta(req);

  if (err instanceof ApiError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error({ err, requestId, correlationId: meta.correlationId }, err.message);
    } else {
      logger.warn({ err: { code: err.code, message: err.message }, requestId }, err.message);
    }

    ApiResponse.error(res, err.message, err.statusCode, err.code, err.details, meta);
    return;
  }

  if (err instanceof ZodError) {
    ApiResponse.error(
      res,
      ERROR_MESSAGES.VALIDATION_FAILED,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR',
      err.issues,
      meta,
    );
    return;
  }

  if (err instanceof MulterError) {
    ApiResponse.error(res, err.message, HTTP_STATUS.BAD_REQUEST, 'UPLOAD_ERROR', undefined, meta);
    return;
  }

  if (err instanceof Error && err.message.includes('not allowed by CORS')) {
    ApiResponse.error(res, err.message, HTTP_STATUS.FORBIDDEN, 'CORS_DENIED', undefined, meta);
    return;
  }

  logger.error({ err, requestId, correlationId: meta.correlationId }, 'Unhandled error');

  const message = appConfig.app.isProd
    ? ERROR_MESSAGES.INTERNAL
    : (err as Error)?.message || ERROR_MESSAGES.INTERNAL;

  ApiResponse.error(
    res,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
    undefined,
    meta,
  );
}
