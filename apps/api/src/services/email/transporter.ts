import nodemailer, { type Transporter } from 'nodemailer';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';

let transporter: Transporter | null = null;

function resolveSmtpAuth(): { user: string; pass: string } | null {
  const user = appConfig.email.from?.trim();
  const pass = appConfig.email.password?.replace(/\s/g, '').trim();
  if (!user || !pass) return null;
  return { user, pass };
}

export function isEmailConfigured(): boolean {
  return Boolean(appConfig.email.host && resolveSmtpAuth());
}

export function getEmailTransporter(): Transporter | null {
  const auth = resolveSmtpAuth();
  if (!auth || !appConfig.email.host) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: appConfig.email.host,
      port: appConfig.email.port,
      secure: appConfig.email.secure,
      auth,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  return transporter;
}

export async function verifyEmailTransporter(): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.error(
      {
        hasHost: Boolean(appConfig.email.host),
        hasUser: Boolean(appConfig.email.from),
        hasPassword: Boolean(appConfig.email.password),
      },
      'Email configuration invalid — set SMTP_HOST, EMAIL_FROM, and EMAIL_PASSWORD',
    );
    return false;
  }

  const transport = getEmailTransporter();
  if (!transport) {
    logger.error('Email transporter could not be created');
    return false;
  }

  try {
    await transport.verify();
    logger.info(
      {
        host: appConfig.email.host,
        port: appConfig.email.port,
        from: appConfig.email.from,
      },
      'Email transporter verified successfully',
    );
    return true;
  } catch (err) {
    logger.error({ err, host: appConfig.email.host }, 'Email transporter verification failed');
    return false;
  }
}
