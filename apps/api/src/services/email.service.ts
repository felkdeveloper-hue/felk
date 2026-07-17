import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import type { EmailService, SendEmailInput } from '@/services/interfaces/email.service';

/**
 * Email service structure only — logs in development, no real SMTP until configured.
 */
export class NodemailerEmailService implements EmailService {
  async send(input: SendEmailInput): Promise<{ messageId: string }> {
    const messageId = `dev-${Date.now()}`;

    logger.info(
      {
        to: input.to,
        subject: input.subject,
        from: appConfig.email.from,
        smtpConfigured: Boolean(appConfig.email.host),
        messageId,
      },
      'EmailService.send (structure only — not dispatched)',
    );

    return { messageId };
  }

  async verifyConnection(): Promise<boolean> {
    if (!appConfig.email.host) {
      return false;
    }

    // Real nodemailer verify will be wired when SMTP credentials are provided.
    return true;
  }
}

export const emailService: EmailService = new NodemailerEmailService();
