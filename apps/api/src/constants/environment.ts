export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type EnvironmentName = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

export const HEADER_NAMES = {
  REQUEST_ID: 'x-request-id',
  CORRELATION_ID: 'x-correlation-id',
  IDEMPOTENCY_KEY: 'idempotency-key',
  AUTHORIZATION: 'authorization',
} as const;
