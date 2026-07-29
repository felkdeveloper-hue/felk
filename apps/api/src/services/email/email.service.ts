import { logger } from '@/config/logger.js';
import type { EmailService, SendEmailInput } from '@/services/interfaces/email.service.js';
import {
  getEmailTransporter,
  isEmailConfigured,
  verifyEmailTransporter,
} from '@/services/email/transporter.js';
import { verificationTemplate } from '@/services/email/templates/verification.js';
import { welcomeTemplate, type WelcomeUser } from '@/services/email/templates/welcome.js';
import { passwordResetTemplate } from '@/services/email/templates/password-reset.js';
import { orderPlacedTemplate } from '@/services/email/templates/order-placed.js';
import { orderConfirmationTemplate } from '@/services/email/templates/order-confirmation.js';
import { orderCancelledTemplate } from '@/services/email/templates/order-cancelled.js';
import { shippingTemplate } from '@/services/email/templates/shipping.js';
import { refundTemplate } from '@/services/email/templates/refund.js';
import { invoiceTemplate } from '@/services/email/templates/invoice.js';
import { newsletterTemplate } from '@/services/email/templates/newsletter.js';
import type { OrderEmailData } from '@/services/email/templates/order-types.js';

function buildFromAddress(): string {
  const from = process.env.EMAIL_FROM ?? '';
  return `Fashion Edge <${from}>`;
}

export class CentralizedEmailService implements EmailService {
  isConfigured(): boolean {
    return isEmailConfigured();
  }

  async verifyConnection(): Promise<boolean> {
    return verifyEmailTransporter();
  }

  async send(input: SendEmailInput): Promise<{ messageId: string }> {
    return this.deliver(input);
  }

  private async deliver(input: SendEmailInput, attempt = 1): Promise<{ messageId: string }> {
    const transport = getEmailTransporter();

    if (!transport) {
      const messageId = `noop-${Date.now()}`;
      logger.warn(
        { to: input.to, subject: input.subject, messageId },
        'EmailService: SMTP not configured — email not sent',
      );
      return { messageId };
    }

    const to = Array.isArray(input.to) ? input.to.join(', ') : input.to;

    try {
      const info = await transport.sendMail({
        from: buildFromAddress(),
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        cc: input.cc,
        bcc: input.bcc,
        replyTo: input.replyTo,
        attachments: input.attachments,
      });

      const messageId = String(info.messageId);
      logger.info({ to, subject: input.subject, messageId, attempt }, 'EmailService: email sent');
      return { messageId };
    } catch (err) {
      logger.error({ err, to, subject: input.subject, attempt }, 'EmailService: send failed');

      if (attempt < 2) {
        logger.info({ to, subject: input.subject }, 'EmailService: retrying send');
        return this.deliver(input, attempt + 1);
      }

      throw err;
    }
  }

  private async sendTemplate(
    to: string,
    template: { subject: string; html: string; text: string },
  ) {
    return this.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendVerificationOTP(
    email: string,
    otp: string,
    options?: { name?: string; expiryMinutes?: number },
  ): Promise<{ messageId: string }> {
    const name = options?.name ?? 'there';
    const template = verificationTemplate(name, otp, options?.expiryMinutes ?? 10);
    return this.sendTemplate(email, template);
  }

  async sendWelcomeEmail(user: WelcomeUser): Promise<{ messageId: string }> {
    return this.sendTemplate(user.email, welcomeTemplate(user));
  }

  async sendOrderPlacedEmail(order: OrderEmailData): Promise<{ messageId: string }> {
    return this.sendTemplate(order.email, orderPlacedTemplate(order));
  }

  async sendOrderConfirmation(order: OrderEmailData): Promise<{ messageId: string }> {
    return this.sendTemplate(order.email, orderConfirmationTemplate(order));
  }

  async sendOrderCancelled(order: OrderEmailData): Promise<{ messageId: string }> {
    return this.sendTemplate(order.email, orderCancelledTemplate(order));
  }

  async sendOrderShipped(order: OrderEmailData): Promise<{ messageId: string }> {
    return this.sendTemplate(order.email, shippingTemplate(order));
  }

  async sendRefundEmail(order: OrderEmailData): Promise<{ messageId: string }> {
    return this.sendTemplate(order.email, refundTemplate(order));
  }

  async sendPasswordReset(
    email: string,
    token: string,
    options?: { name?: string; expiryMinutes?: number },
  ): Promise<{ messageId: string }> {
    const name = options?.name ?? 'there';
    const template = passwordResetTemplate(name, token, options?.expiryMinutes ?? 30);
    return this.sendTemplate(email, template);
  }

  async sendInvoice(order: OrderEmailData): Promise<{ messageId: string }> {
    return this.sendTemplate(order.email, invoiceTemplate(order));
  }

  async sendNewsletter(
    email: string,
    subject: string,
    html: string,
  ): Promise<{ messageId: string }> {
    const template = newsletterTemplate(subject, html);
    return this.sendTemplate(email, template);
  }
}

export const emailService = new CentralizedEmailService();

export async function trySendEmail(input: SendEmailInput): Promise<boolean> {
  try {
    await emailService.send(input);
    return true;
  } catch (err) {
    logger.warn({ err, to: input.to, subject: input.subject }, 'Email: send failed');
    return false;
  }
}

export { verifyEmailTransporter };
