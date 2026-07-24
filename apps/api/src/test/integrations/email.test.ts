import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CentralizedEmailService } from '@/services/email/email.service';

vi.mock('@/services/email/transporter', () => ({
  isEmailConfigured: vi.fn().mockReturnValue(true),
  getEmailTransporter: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-smtp-msg-1' }),
    verify: vi.fn().mockResolvedValue(true),
  }),
  verifyEmailTransporter: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('CentralizedEmailService', () => {
  let service: CentralizedEmailService;

  beforeEach(() => {
    service = new CentralizedEmailService();
  });

  it('sends an email and returns messageId', async () => {
    const result = await service.send({
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(result.messageId).toBe('test-smtp-msg-1');
  });

  it('verifies connection successfully', async () => {
    const ok = await service.verifyConnection();
    expect(ok).toBe(true);
  });

  it('sendVerificationOTP renders template and sends', async () => {
    const result = await service.sendVerificationOTP('user@example.com', '123456', {
      name: 'Jane',
    });

    expect(result.messageId).toBe('test-smtp-msg-1');
  });
});
