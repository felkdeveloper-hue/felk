import { EmailLogModel } from '@/models/email-log.model';
import { emailService } from '@/services/email.service';
import { logger } from '@/config/logger';
import type { SendEmailInput } from '@/services/interfaces/email.service';

export interface EnqueueEmailOptions extends SendEmailInput {
  templateKey?: string;
  maxAttempts?: number;
}

export class EmailQueueService {
  /**
   * Enqueue an email: persist the log record, attempt immediate send,
   * and mark it for retry if the first send fails.
   */
  async enqueue(opts: EnqueueEmailOptions): Promise<{ logId: string; messageId?: string }> {
    const to = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;

    const log = await EmailLogModel.create({
      to,
      subject: opts.subject,
      templateKey: opts.templateKey ?? null,
      html: opts.html ?? null,
      text: opts.text ?? null,
      status: 'pending',
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 3,
      nextAttemptAt: null,
    });

    try {
      const result = await emailService.send(opts);
      log.status = 'sent';
      log.messageId = result.messageId;
      log.sentAt = new Date();
      await log.save();
      return { logId: log._id.toString(), messageId: result.messageId };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log.status = 'retrying';
      log.lastError = errMsg;
      log.attempts = 1;
      log.nextAttemptAt = new Date(Date.now() + 30_000);
      await log.save();
      logger.warn(
        { to, subject: opts.subject, err: errMsg },
        'EmailQueue: immediate send failed, queued for retry',
      );
      return { logId: log._id.toString() };
    }
  }

  /** Called by the retry sweep to re-send a previously failed email log. */
  async sendFromLog(logDoc: {
    to: string;
    subject: string;
    html: string | null;
    text: string | null;
    set: (key: string, val: unknown) => void;
  }): Promise<void> {
    const result = await emailService.send({
      to: logDoc.to,
      subject: logDoc.subject,
      html: logDoc.html ?? undefined,
      text: logDoc.text ?? undefined,
    });
    logDoc.set('messageId', result.messageId);
    logDoc.set('sentAt', new Date());
  }
}

export const emailQueueService = new EmailQueueService();
