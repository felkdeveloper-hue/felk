import type { PermissionKey } from '@/constants/permissions';
import type { RoleKey } from '@/constants/roles';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiSuccessBody<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | unknown[];
  };
  meta?: {
    requestId?: string;
    correlationId?: string;
  };
}

export type ApiResponseBody<T = unknown> = ApiSuccessBody<T> | ApiErrorBody;

/**
 * JWT access payload shape.
 */
export interface JwtPayload {
  sub: string;
  roleId: string;
  roleKey?: RoleKey;
  typ: 'access' | 'refresh';
  jti: string;
  sid?: string;
  iat?: number;
  exp?: number;
}

export interface AccessTokenPayload extends JwtPayload {
  typ: 'access';
  roleKey: RoleKey;
  sid: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleKey: RoleKey;
  permissions: PermissionKey[];
  sessionId: string;
  emailVerified: boolean;
  status: string;
}

export interface RequestContext {
  requestId: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
  user?: AuthenticatedUser;
}

export type { PermissionKey, RoleKey };
