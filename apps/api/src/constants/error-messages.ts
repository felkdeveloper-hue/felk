export const ERROR_MESSAGES = {
  INTERNAL: 'Something went wrong',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to perform this action',
  VALIDATION_FAILED: 'Validation failed',
  RATE_LIMITED: 'Too many requests, please try again later',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account is temporarily locked',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Token is invalid',
  AUTH_NOT_IMPLEMENTED: 'Authentication is not implemented yet',
  AUTHORIZATION_NOT_IMPLEMENTED: 'Authorization is not implemented yet',
} as const;
