import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';

export function isEmailDeliveryConfigured(): boolean {
  const { enabled, host, user, pass } = appConfig.email;
  return Boolean(enabled && host && user && pass);
}

export function attachDevVerificationUrl<T extends { message: string }>(
  payload: T,
  verifyUrl: string,
): T & { devVerificationUrl?: string } {
  if (!appConfig.app.isDev || isEmailDeliveryConfigured()) {
    return payload;
  }

  logger.warn(
    { verifyUrl },
    'Auth: SMTP is not configured — verification email was not sent (devVerificationUrl returned)',
  );

  return { ...payload, devVerificationUrl: verifyUrl };
}
