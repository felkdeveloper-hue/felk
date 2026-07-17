/**
 * Email delivery contract — structure only (Phase 1).
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailService {
  send(input: SendEmailInput): Promise<{ messageId: string }>;
  verifyConnection(): Promise<boolean>;
}
