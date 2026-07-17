import type { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types';

export class AppError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.details = options.details;
  }

  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }

  static fromAxiosError(error: AxiosError<ApiErrorBody>): AppError {
    if (!error.response) {
      return new AppError('Unable to reach the server.', { code: 'NETWORK_ERROR' });
    }
    const body = error.response.data;
    return new AppError(body?.error?.message ?? error.message, {
      status: error.response.status,
      code: body?.error?.code ?? `HTTP_${error.response.status}`,
      details: body?.error?.details,
    });
  }
}
