import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';

export function isEmailDeliveryConfigured(): boolean {
  const { enabled, host, from, user, password } = appConfig.email;
  return Boolean(enabled && host && (user || from) && password);
}

/**
 * Never return OTPs to the client — codes must arrive by email only.
 * Server logs still record delivery failures for ops debugging.
 */
export function attachDevVerificationCode<T extends { message: string }>(
  payload: T,
  _code: string,
  delivered: boolean,
): T & { devVerificationCode?: string } {
  if (!delivered) {
    logger.warn('Auth: verification email was not delivered — OTP not returned to client');
  }
  return payload;
}

export function attachDevResetCode<T extends { message: string }>(
  payload: T,
  code: string,
  delivered: boolean,
): T & { devResetCode?: string } {
  if (!appConfig.app.isDev || delivered) {
    return payload;
  }

  logger.warn(
    { code },
    'Auth: password reset email was not delivered — devResetCode returned instead',
  );

  return { ...payload, devResetCode: code };
}
