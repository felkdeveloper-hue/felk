import nodemailer, { type Transporter } from 'nodemailer';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';

let transporter: Transporter | null = null;

function resolveSmtpAuth(): { user: string; pass: string } | null {
  const user = (appConfig.email.user ?? appConfig.email.from)?.trim();
  // Gmail app passwords are often pasted with spaces; Hostinger passwords must stay intact.
  const rawPass = appConfig.email.password?.trim() ?? '';
  const pass = appConfig.email.host?.includes('gmail') ? rawPass.replace(/\s/g, '') : rawPass;
  if (!user || !pass) return null;
  return { user, pass };
}

export function isEmailConfigured(): boolean {
  return Boolean(appConfig.email.host && resolveSmtpAuth());
}

export function resetEmailTransporter(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}

export function getEmailTransporter(): Transporter | null {
  const auth = resolveSmtpAuth();
  if (!auth || !appConfig.email.host) {
    return null;
  }

  if (!transporter) {
    const port = appConfig.email.port;
    const secure = appConfig.email.secure || port === 465;

    transporter = nodemailer.createTransport({
      host: appConfig.email.host,
      port,
      secure,
      // Hostinger (and most shared hosts) expect STARTTLS on 587
      requireTLS: !secure && port === 587,
      auth,
      // LOGIN handles special characters in passwords more reliably than PLAIN
      authMethod: 'LOGIN',
      tls: {
        minVersion: 'TLSv1.2',
      },
      // Avoid pooled sockets — Titan often drops idle connections → "Greeting never received".
      pool: false,
      // Titan/shared SMTP can be slow from some networks; keep under client timeout.
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 25_000,
    });
  }

  return transporter;
}

export async function verifyEmailTransporter(): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.error(
      {
        hasHost: Boolean(appConfig.email.host),
        hasUser: Boolean(appConfig.email.user ?? appConfig.email.from),
        hasPassword: Boolean(appConfig.email.password),
      },
      'Email configuration invalid — set SMTP_HOST, EMAIL_FROM (or SMTP_USER), and EMAIL_PASSWORD',
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
        user: appConfig.email.user ?? appConfig.email.from,
      },
      'Email transporter verified successfully',
    );
    return true;
  } catch (err) {
    logger.error({ err, host: appConfig.email.host }, 'Email transporter verification failed');
    return false;
  } finally {
    // Titan is flaky if the verify socket is reused for the next sendMail.
    resetEmailTransporter();
  }
}
