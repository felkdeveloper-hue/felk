import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { HEADER_NAMES } from '@/constants/environment';

/**
 * Ensures every request has a stable request id for tracing/logs.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming =
    (req.headers[HEADER_NAMES.REQUEST_ID] as string | undefined) ||
    (req.headers[HEADER_NAMES.CORRELATION_ID] as string | undefined);

  const requestId = incoming?.trim() || randomUUID();

  req.requestId = requestId;
  req.context = {
    requestId,
    correlationId: (req.headers[HEADER_NAMES.CORRELATION_ID] as string | undefined) || requestId,
    ip: req.ip,
    userAgent: req.get('user-agent') || undefined,
  };

  res.setHeader(HEADER_NAMES.REQUEST_ID, requestId);
  res.setHeader(HEADER_NAMES.CORRELATION_ID, req.context.correlationId ?? requestId);
  next();
}
