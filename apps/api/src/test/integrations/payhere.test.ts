import { describe, it, expect, vi } from 'vitest';
import { md5Hex } from '@/utils/crypto.helper';

const MERCHANT_ID = 'test-merchant-123';
const MERCHANT_SECRET = 'test-secret-abc';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    payment: {
      payhere: {
        merchantId: 'test-merchant-123',
        merchantSecret: 'test-secret-abc',
        mode: 'sandbox',
      },
      koko: { merchantId: 'km', secretKey: 'ks', apiKey: null, privateKeyPath: null },
      mintpay: { merchantId: 'mm', secretKey: 'ms', mode: 'sandbox' },
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

function buildHash(orderId: string, amount: string, currency: string, status: string) {
  const secretHash = md5Hex(MERCHANT_SECRET);
  return md5Hex(`${MERCHANT_ID}${orderId}${amount}${currency}${status}${secretHash}`).toUpperCase();
}

describe('PayHere gateway', () => {
  it('returns a sandbox redirect URL with hash', async () => {
    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();

    const result = await gateway.createSession({
      orderId: 'ORD-001',
      amount: 1500,
      currency: 'LKR',
      method: 'payhere',
      customerEmail: 'test@example.com',
      returnUrl: 'https://example.com/return',
      cancelUrl: 'https://example.com/cancel',
      idempotencyKey: 'idem-1',
    });

    expect(result.redirectUrl).toContain('sandbox.payhere.lk');
    expect(result.redirectUrl).toContain('order_id=ORD-001');
    expect(result.redirectUrl).toContain('hash=');
    expect(result.raw?.merchantId).toBe(MERCHANT_ID);
  });

  it('verifyWebhook returns valid=true with correct MD5 signature', async () => {
    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();

    const orderId = 'ORD-001';
    const amount = '1500.00';
    const currency = 'LKR';
    const statusCode = '2';
    const sig = buildHash(orderId, amount, currency, statusCode);

    const body = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      order_id: orderId,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: statusCode,
      md5sig: sig,
    }).toString();

    const result = await gateway.verifyWebhook({
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      rawBody: Buffer.from(body),
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('paid');
    expect(result.orderId).toBe(orderId);
  });

  it('verifyWebhook returns valid=false with wrong signature', async () => {
    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();

    const body = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      order_id: 'ORD-001',
      payhere_amount: '1500.00',
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: 'WRONGSIG',
    }).toString();

    const result = await gateway.verifyWebhook({ headers: {}, rawBody: Buffer.from(body) });
    expect(result.valid).toBe(false);
  });

  it('verifyWebhook returns valid=false when merchant ID mismatches', async () => {
    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();

    const body = new URLSearchParams({
      merchant_id: 'other-merchant',
      order_id: 'ORD-001',
      payhere_amount: '1500.00',
      payhere_currency: 'LKR',
      status_code: '2',
      md5sig: 'ANYSIG',
    }).toString();

    const result = await gateway.verifyWebhook({ headers: {}, rawBody: Buffer.from(body) });
    expect(result.valid).toBe(false);
  });

  it('maps status_code -1 to cancelled', async () => {
    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();

    const orderId = 'ORD-002';
    const amount = '500.00';
    const currency = 'LKR';
    const statusCode = '-1';
    const sig = buildHash(orderId, amount, currency, statusCode);

    const body = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      order_id: orderId,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: statusCode,
      md5sig: sig,
    }).toString();

    const result = await gateway.verifyWebhook({ headers: {}, rawBody: Buffer.from(body) });
    expect(result.valid).toBe(true);
    expect(result.status).toBe('cancelled');
  });
});
