import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ERROR_MESSAGES } from '@/constants/error-messages';
import { ApiError } from '@/utils/errors/api-error';

interface ValidateOptions {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Zod validation middleware — parses and replaces matched request parts.
 */
export function validate(schemas: ValidateOptions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request['params'];
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          ApiError.badRequest(
            ERROR_MESSAGES.VALIDATION_FAILED,
            formatZodError(error),
            'VALIDATION_ERROR',
          ),
        );
        return;
      }

      next(error);
    }
  };
}
