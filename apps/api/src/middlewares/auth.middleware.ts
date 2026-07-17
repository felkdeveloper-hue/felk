import type { NextFunction, Request, Response } from 'express';
import { AUTH_COOKIES } from '@/constants/auth';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import type { PermissionKey } from '@/constants/permissions';
import type { RoleKey } from '@/constants/roles';
import { authService } from '@/services/auth.service';
import { userHasPermission, userHasRole } from '@/services/rbac.service';
import { isAccessTokenBlacklisted, verifyAccessToken } from '@/services/token.service';
import { ApiError } from '@/utils/errors/api-error';

function extractAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  const cookieToken = req.cookies?.[AUTH_COOKIES.ACCESS] as string | undefined;
  return cookieToken || undefined;
}

async function attachUser(req: Request, required: boolean): Promise<void> {
  const token = extractAccessToken(req);

  if (!token) {
    if (required) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }
    return;
  }

  const payload = verifyAccessToken(token);

  if (await isAccessTokenBlacklisted(payload.jti)) {
    throw ApiError.unauthorized('Token has been revoked', 'TOKEN_REVOKED');
  }

  const user = await authService.buildAuthenticatedUser({
    userId: payload.sub,
    sessionId: payload.sid,
  });

  req.user = user;
  req.context.user = user;
  req.accessTokenJti = payload.jti;
  req.accessToken = token;
}

/**
 * Require a valid access token (Bearer or cookie).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  void attachUser(req, true)
    .then(() => next())
    .catch(next);
}

/**
 * Attach user when token present; otherwise continue.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  void attachUser(req, false)
    .then(() => next())
    .catch(next);
}

/** Alias per Phase 2 naming */
export const optionalAuth = optionalAuthenticate;

/**
 * Require all listed permissions (AND).
 */
export function authorize(...permissions: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED));
      return;
    }

    if (!userHasPermission(req.user.permissions, permissions, 'all')) {
      next(ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN, 'FORBIDDEN'));
      return;
    }

    next();
  };
}

/**
 * Require any of the listed permissions (OR).
 */
export function authorizeAny(...permissions: PermissionKey[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED));
      return;
    }

    if (!userHasPermission(req.user.permissions, permissions, 'any')) {
      next(ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN, 'FORBIDDEN'));
      return;
    }

    next();
  };
}

export const requirePermission = authorize;
export const requirePermissions = authorize;

/**
 * Require one of the listed roles.
 */
export function requireRole(...roles: RoleKey[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED));
      return;
    }

    if (!userHasRole(req.user.roleKey, roles)) {
      next(ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN, 'ROLE_FORBIDDEN'));
      return;
    }

    next();
  };
}

export const requireRoles = requireRole;

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const bodyToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const cookieToken = req.cookies?.[AUTH_COOKIES.REFRESH] as string | undefined;
  return bodyToken || cookieToken || undefined;
}

export function getAccessTokenFromRequest(req: Request): string | undefined {
  return extractAccessToken(req);
}
