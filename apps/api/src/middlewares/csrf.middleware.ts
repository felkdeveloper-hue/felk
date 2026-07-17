import type { NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import { HTTP_STATUS } from '@/constants/http';
import { ApiResponse } from '@/utils/response/api-response';

const CSRF_COOKIE = 'fe_csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Double-submit cookie CSRF protection for cookie-authenticated browser clients.
 * Disabled by default (CSRF_ENABLED=false) for backward compatibility.
 * Bearer-token API clients are exempt.
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!appConfig.security.csrfEnabled) {
    next();
    return;
  }

  const usesBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
  if (usesBearer) {
    next();
    return;
  }

  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: appConfig.cookie.secure,
        sameSite: appConfig.cookie.sameSite,
        path: '/',
      });
    }
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = (req.headers[CSRF_HEADER] as string | undefined)?.trim();

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    ApiResponse.error(res, 'Invalid CSRF token', HTTP_STATUS.FORBIDDEN, 'CSRF_INVALID');
    return;
  }

  next();
}

export { CSRF_COOKIE, CSRF_HEADER };
