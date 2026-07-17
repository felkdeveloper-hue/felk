import type { Response } from 'express';
import { HTTP_STATUS, type HttpStatusCode } from '@/constants/http';
import type { ApiErrorBody, ApiSuccessBody, PaginationMeta } from '@/types';

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode: HttpStatusCode = HTTP_STATUS.OK,
    meta?: PaginationMeta,
  ): Response {
    const body: ApiSuccessBody<T> = {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    };

    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data: T, message = 'Created'): Response {
    return ApiResponse.success(res, data, message, HTTP_STATUS.CREATED);
  }

  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = 'ERROR',
    details?: ApiErrorBody['error']['details'],
    meta?: ApiErrorBody['meta'],
  ): Response {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      ...(meta ? { meta } : {}),
    };

    return res.status(statusCode).json(body);
  }
}

/** Convenience wrappers used by older scaffold helpers */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: HttpStatusCode = HTTP_STATUS.OK,
): Response {
  return ApiResponse.success(res, data, message, statusCode);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code = 'ERROR',
  details?: ApiErrorBody['error']['details'],
): Response {
  return ApiResponse.error(res, message, statusCode, code, details);
}
