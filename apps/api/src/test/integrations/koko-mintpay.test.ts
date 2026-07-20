import { describe, it, expect, vi } from 'vitest';
import { hmacSha256Hex } from '@/utils/crypto.helper';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    payment: {
      payhere: { merchantId: 'pm', merchantSecret: 'ps', mode: 'sandbox' },
      koko: {
        merchantId: 'koko-merchant',
        secretKey: 'koko-test-secret',
        apiKey: null,
        privateKeyPath: null,
      },
      mintpay: {
        merchantId: 'mintpay-merchant',
        secretKey: 'mintpay-test-secret',
        mode: 'sandbox',
      },
    },
  },
}));

vi.mock('@/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/http-retry', () => ({
  fetchWithRetry: vi.fn().mockResolvedValue({ data: {}, attempts: 1 }),
  HttpRetryError: class HttpRetryError extends Error {},
}));

describe('Koko gateway', () => {
  it('returns fallback redirect when no API key configured', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway');
    const gateway = new KokoGateway();
    const result = await gateway.createSession({
      orderId: 'ORD-KOKO-001',
      amount: 2000,
      currency: 'LKR',
      method: 'koko',
      customerEmail: 'test@example.com',
      returnUrl: 'https://example.com/return',
      cancelUrl: 'https://example.com/cancel',
      idempotencyKey: 'idem-koko-1',
    });

    expect(result.redirectUrl).toContain('koko.lk');
    expect(result.gatewayPaymentId).toContain('koko_ORD-KOKO-001_');
    expect(result.raw?.mode).toBe('fallback');
  });

  it('returns valid=true with correct HMAC', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway');
    const gateway = new KokoGateway();
    const body = JSON.stringify({
      orderId: 'ORD-001',
      status: 'approved',
      transactionId: 'TX1',
      amount: 2000,
      currency: 'LKR',
    });
    const sig = hmacSha256Hex('koko-test-secret', body);

    const result = await gateway.verifyWebhook({
      headers: { 'x-koko-signature': sig },
      rawBody: Buffer.from(body),
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('paid');
  });

  it('returns valid=false with wrong HMAC', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway');
    const gateway = new KokoGateway();
    const body = JSON.stringify({ orderId: 'ORD-001', status: 'approved' });
    const result = await gateway.verifyWebhook({
      headers: { 'x-koko-signature': 'badsig' },
      rawBody: Buffer.from(body),
    });
    expect(result.valid).toBe(false);
  });

  it('returns valid=false with missing signature header', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway');
    const gateway = new KokoGateway();
    const body = JSON.stringify({ orderId: 'ORD-001', status: 'approved' });
    const result = await gateway.verifyWebhook({ headers: {}, rawBody: Buffer.from(body) });
    expect(result.valid).toBe(false);
  });
});

describe('Mintpay gateway', () => {
  it('returns sandbox redirect URL', async () => {
    const { MintpayGateway } = await import('@/services/gateways/mintpay.gateway');
    const gateway = new MintpayGateway();
    const result = await gateway.createSession({
      orderId: 'ORD-MP-001',
      amount: 3000,
      currency: 'LKR',
      method: 'mintpay',
      customerEmail: 'test@example.com',
      returnUrl: 'https://example.com/return',
      cancelUrl: 'https://example.com/cancel',
      idempotencyKey: 'idem-mp-1',
    });

    expect(result.redirectUrl).toContain('mintpay.lk');
    expect(result.raw?.mode).toBe('sandbox');
  });

  it('returns valid=true with correct HMAC', async () => {
    const { MintpayGateway } = await import('@/services/gateways/mintpay.gateway');
    const gateway = new MintpayGateway();
    const body = JSON.stringify({
      orderId: 'ORD-001',
      status: 'success',
      transactionId: 'TX2',
      amount: 3000,
      currency: 'LKR',
    });
    const sig = hmacSha256Hex('mintpay-test-secret', body);

    const result = await gateway.verifyWebhook({
      headers: { 'x-mintpay-signature': sig },
      rawBody: Buffer.from(body),
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('paid');
  });

  it('returns valid=false with wrong signature', async () => {
    const { MintpayGateway } = await import('@/services/gateways/mintpay.gateway');
    const gateway = new MintpayGateway();
    const body = JSON.stringify({ status: 'success' });
    const result = await gateway.verifyWebhook({
      headers: { 'x-mintpay-signature': 'badsig' },
      rawBody: Buffer.from(body),
    });
    expect(result.valid).toBe(false);
  });
});
