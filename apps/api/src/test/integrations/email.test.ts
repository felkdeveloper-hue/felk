import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodemailerEmailService } from '@/services/email.service';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-msg-id-1' }),
      verify: vi.fn().mockResolvedValue(true),
    }),
  },
}));

vi.mock('@/config/app.config', () => ({
  appConfig: {
    email: {
      enabled: true,
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      user: 'test@example.com',
      pass: 'test-pass',
      from: 'Fashion Edge <system@technixinc.com>',
      fromEmail: 'system@technixinc.com',
      fromName: 'Fashion Edge',
    },
  },
}));

vi.mock('@/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('NodemailerEmailService', () => {
  let service: NodemailerEmailService;

  beforeEach(() => {
    service = new NodemailerEmailService();
  });

  it('sends an email and returns messageId', async () => {
    const result = await service.send({
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(result.messageId).toBe('test-msg-id-1');
  });

  it('verifies connection successfully', async () => {
    const ok = await service.verifyConnection();
    expect(ok).toBe(true);
  });

  it('handles failed verify gracefully', async () => {
    const nodemailer = await import('nodemailer');
    vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
      sendMail: vi.fn(),
      verify: vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')),
    } as unknown as ReturnType<typeof nodemailer.default.createTransport>);

    const svc2 = new NodemailerEmailService();
    const ok = await svc2.verifyConnection();
    expect(ok).toBe(false);
  });

  it('is no-op when SMTP disabled', async () => {
    const nodemailer = await import('nodemailer');
    const sendMail = vi.fn();
    vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
      sendMail,
      verify: vi.fn(),
    } as unknown as ReturnType<typeof nodemailer.default.createTransport>);

    const { appConfig } = await import('@/config/app.config');
    const origEnabled = appConfig.email.enabled;
    (appConfig.email as { enabled: boolean }).enabled = false;

    const svc3 = new NodemailerEmailService();
    const result = await svc3.send({ to: 'x@x.com', subject: 'Test', text: 'test' });
    expect(result.messageId).toContain('noop-');
    expect(sendMail).not.toHaveBeenCalled();

    (appConfig.email as { enabled: boolean }).enabled = origEnabled as boolean;
  });
});
