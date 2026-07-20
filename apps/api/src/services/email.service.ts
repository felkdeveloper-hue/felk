import nodemailer, { type Transporter } from 'nodemailer';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import type { EmailService, SendEmailInput } from '@/services/interfaces/email.service';

function buildFromAddress(): string {
  const fromEmail = appConfig.email.fromEmail ?? appConfig.email.from;
  const fromName = appConfig.email.fromName;
  if (fromName && fromEmail) {
    return `${fromName} <${fromEmail}>`;
  }
  return fromEmail ?? 'Fashion Edge <system@technixinc.com>';
}

function createTransport(): Transporter | null {
  const { host, port, secure, user, pass } = appConfig.email;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: port ?? 465,
    secure: secure ?? port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
    tls: { rejectUnauthorized: true },
  });
}

export class NodemailerEmailService implements EmailService {
  private transporter: Transporter | null = null;

  private getTransport(): Transporter | null {
    if (!this.transporter) {
      this.transporter = createTransport();
    }
    return this.transporter;
  }

  async send(input: SendEmailInput): Promise<{ messageId: string }> {
    const transport = this.getTransport();

    if (!appConfig.email.enabled || !transport) {
      const messageId = `noop-${Date.now()}`;
      logger.info(
        {
          to: input.to,
          subject: input.subject,
          smtpEnabled: appConfig.email.enabled,
          smtpConfigured: Boolean(appConfig.email.host),
          messageId,
        },
        'EmailService: SMTP not enabled/configured — email not sent',
      );
      return { messageId };
    }

    try {
      const from = buildFromAddress();
      const info = await transport.sendMail({
        from,
        to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        cc: input.cc,
        bcc: input.bcc,
        replyTo: input.replyTo,
        attachments: input.attachments,
      });

      logger.info(
        { to: input.to, subject: input.subject, messageId: info.messageId },
        'EmailService: email sent',
      );
      return { messageId: String(info.messageId) };
    } catch (err) {
      logger.error({ err, to: input.to, subject: input.subject }, 'EmailService: send failed');
      throw err;
    }
  }

  async verifyConnection(): Promise<boolean> {
    const transport = this.getTransport();
    if (!transport) return false;
    try {
      await transport.verify();
      logger.info('EmailService: SMTP connection verified');
      return true;
    } catch (err) {
      logger.warn({ err }, 'EmailService: SMTP connection verification failed');
      return false;
    }
  }
}

export const emailService: EmailService = new NodemailerEmailService();
