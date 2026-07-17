import type { NextFunction, Request, Response } from 'express';

/**
 * Strips keys starting with $ or containing . from req.body, req.query, req.params
 * to mitigate MongoDB operator injection via user-controlled objects.
 */
export function mongoSanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
}

function sanitizeObject(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    sanitizeObject((value as Record<string, unknown>)[key]);
  }
}
