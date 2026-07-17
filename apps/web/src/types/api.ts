/**
 * Shared HTTP/API envelope types mirroring the backend response contract.
 * These extend the cross-package `@fe-platform/types` shapes with the
 * concrete envelope fields used by `src/lib/http-client.ts`.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiSuccessBody<T> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetails {
  [key: string]: unknown;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetails;
  };
}

export type ApiEnvelope<T> = ApiSuccessBody<T> | ApiErrorBody;

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

export interface MessageResult {
  message: string;
}
