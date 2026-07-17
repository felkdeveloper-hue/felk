import type { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types';

export interface AppErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
  requestId?: string;
  cause?: unknown;
}

/**
 * Normalized application error. All errors surfaced from the HTTP client
 * are instances of `AppError`, so UI code can rely on a single shape
 * regardless of whether the failure came from the network, the server,
 * or client-side validation.
 */
export class AppError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.details = options.details;
    this.requestId = options.requestId;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }

  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }

  get isTimeout(): boolean {
    return this.code === 'TIMEOUT';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.code === 'VALIDATION_ERROR';
  }

  static fromAxiosError(error: AxiosError<ApiErrorBody>): AppError {
    const rawRequestId = error.config?.headers?.get?.('X-Request-Id');
    const requestId = typeof rawRequestId === 'string' ? rawRequestId : undefined;

    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return new AppError('The request timed out. Please try again.', {
        code: 'TIMEOUT',
        requestId,
        cause: error,
      });
    }

    if (!error.response) {
      return new AppError('Unable to reach the server. Check your connection.', {
        code: 'NETWORK_ERROR',
        requestId,
        cause: error,
      });
    }

    const body = error.response.data;
    const message = body?.error?.message ?? error.message ?? 'Something went wrong';
    const code = body?.error?.code ?? `HTTP_${error.response.status}`;

    return new AppError(message, {
      status: error.response.status,
      code,
      details: body?.error?.details,
      requestId,
      cause: error,
    });
  }

  static fromUnknown(error: unknown): AppError {
    if (AppError.isAppError(error)) return error;
    if (error instanceof Error) {
      return new AppError(error.message, { cause: error });
    }
    return new AppError('An unexpected error occurred', { cause: error });
  }
}
