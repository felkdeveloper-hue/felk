import { HTTP_STATUS, type HttpStatusCode } from '@/constants/http';

export type ErrorDetails = Record<string, unknown> | unknown[] | undefined;

/**
 * Operational API error with stable machine-readable code.
 */
export class ApiError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: string;
  public readonly details: ErrorDetails;
  public readonly isOperational: boolean;

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    code = 'APP_ERROR',
    details?: ErrorDetails,
    isOperational = true,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, details?: ErrorDetails, code = 'BAD_REQUEST'): ApiError {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN'): ApiError {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): ApiError {
    return new ApiError(HTTP_STATUS.NOT_FOUND, message, code);
  }

  static conflict(message: string, details?: ErrorDetails, code = 'CONFLICT'): ApiError {
    return new ApiError(HTTP_STATUS.CONFLICT, message, code, details);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED'): ApiError {
    return new ApiError(HTTP_STATUS.TOO_MANY_REQUESTS, message, code);
  }

  static unprocessable(message: string, details?: ErrorDetails, code = 'UNPROCESSABLE'): ApiError {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, code, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR'): ApiError {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message, code, undefined, false);
  }
}

/** @deprecated Prefer ApiError — kept for compatibility during migration */
export class AppError extends ApiError {}
