import { describe, it, expect, vi } from 'vitest';
import { hmacSha256Hex } from '@/utils/crypto.helper';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    app: { version: '0.1.0' },
    cors: { origins: ['http://localhost:5173'] },
    payment: {
      payhere: { merchantId: 'pm', merchantSecret: 'ps', mode: 'sandbox' },
      koko: {
        merchantId: 'koko-merchant',
        secretKey: 'koko-test-secret',
        apiKey: null,
        privateKeyPath: null,
        mode: 'sandbox',
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
  fetchWithRetry: vi.fn().mockResolvedValue({
    data: { message: 'Success', data: 'purchase-abc' },
    attempts: 1,
  }),
  HttpRetryError: class HttpRetryError extends Error {},
}));

describe('Koko gateway', () => {
  it('rejects when API key / private key are missing', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway');
    const gateway = new KokoGateway();
    await expect(
      gateway.createSession({
        orderId: 'ORD-KOKO-001',
        amount: 2000,
        currency: 'LKR',
        method: 'koko',
        customerEmail: 'test@example.com',
        returnUrl: 'https://example.com/return',
        cancelUrl: 'https://example.com/cancel',
        idempotencyKey: 'idem-koko-1',
      }),
    ).rejects.toMatchObject({ code: 'KOKO_NOT_CONFIGURED' });
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
  it('returns sandbox login form redirect', async () => {
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

    expect(result.redirectUrl).toContain('dev.mintpay.lk');
    expect(result.redirectForm?.action).toContain('dev.mintpay.lk/user-order/login');
    expect(result.redirectForm?.fields.purchase_id).toBe('purchase-abc');
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
