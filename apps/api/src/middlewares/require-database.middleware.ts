import type { NextFunction, Request, Response } from 'express';
import { databaseManager } from '@/config/database.js';
import { HTTP_STATUS } from '@/constants/http.js';
import { ApiResponse } from '@/utils/response/api-response.js';

/** Health/version probes must work even when MongoDB is down. */
const SKIP_PREFIXES = ['/health', '/metrics', '/version'];

/**
 * Fail fast with 503 when MongoDB is down — avoids 10s Mongoose buffering timeouts
 * that surface as opaque "users.findOne() buffering timed out" errors in the UI.
 */
export function requireDatabase(req: Request, res: Response, next: NextFunction): void {
  const path = req.path || '';
  if (SKIP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    next();
    return;
  }

  if (databaseManager.isConnected()) {
    next();
    return;
  }

  ApiResponse.error(
    res,
    'Database is unavailable. The API could not reach MongoDB — check your network/DNS or MONGODB_URI, then restart the API.',
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    'DB_UNAVAILABLE',
    {
      status: databaseManager.getStatus(),
      lastError: databaseManager.getLastError()?.message ?? null,
    },
    { requestId: req.requestId },
  );
}
