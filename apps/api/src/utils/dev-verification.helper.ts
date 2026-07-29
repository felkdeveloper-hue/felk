import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';

export function isEmailDeliveryConfigured(): boolean {
  const { enabled, host, from, password } = appConfig.email;
  return Boolean(enabled && host && from && password);
}

/**
 * In dev, surface the raw code in the API response whenever the user can't
 * be expected to receive a real email — either SMTP isn't configured at all,
 * or the send attempt itself failed (wrong credentials, unreachable host,
 * etc). `delivered` should be the actual result of the send attempt.
 */
export function attachDevVerificationCode<T extends { message: string }>(
  payload: T,
  code: string,
  delivered: boolean,
): T & { devVerificationCode?: string } {
  if (!appConfig.app.isDev || delivered) {
    return payload;
  }

  logger.warn(
    { code },
    'Auth: verification email was not delivered — devVerificationCode returned instead',
  );

  return { ...payload, devVerificationCode: code };
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
