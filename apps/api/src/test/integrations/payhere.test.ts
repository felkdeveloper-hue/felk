import { describe, it, expect, vi, beforeEach } from 'vitest';
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
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        notifyUrl: 'https://example.com/api/v1/payments/webhooks/payhere',
      },
      koko: {
        merchantId: 'km',
        secretKey: 'ks',
        apiKey: null,
        privateKeyPath: null,
        mode: 'sandbox',
      },
      mintpay: { merchantId: 'mm', secretKey: 'ms', mode: 'sandbox' },
    },
  },
}));

vi.mock('@/config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const fetchWithRetry = vi.fn();

vi.mock('@/utils/http-retry', () => ({
  fetchWithRetry: (...args: unknown[]) => fetchWithRetry(...args),
  HttpRetryError: class HttpRetryError extends Error {
    constructor(
      message: string,
      public readonly lastStatus?: number,
      public readonly attempts?: number,
    ) {
      super(message);
      this.name = 'HttpRetryError';
    }
  },
}));

function buildHash(orderId: string, amount: string, currency: string, status: string) {
  const secretHash = md5Hex(MERCHANT_SECRET);
  return md5Hex(`${MERCHANT_ID}${orderId}${amount}${currency}${status}${secretHash}`).toUpperCase();
}

describe('PayHere gateway', () => {
  beforeEach(() => {
    fetchWithRetry.mockReset();
    vi.resetModules();
  });

  it('returns a sandbox POST redirectForm with required checkout fields + hash', async () => {
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
      metadata: { firstName: 'Saman', lastName: 'Perera', phone: '0771234567' },
    });

    expect(result.redirectForm?.action).toBe('https://sandbox.payhere.lk/pay/checkout');
    expect(result.redirectForm?.method).toBe('POST');
    expect(result.redirectForm?.fields.merchant_id).toBe(MERCHANT_ID);
    expect(result.redirectForm?.fields.order_id).toBe('ORD-001');
    expect(result.redirectForm?.fields.amount).toBe('1500.00');
    expect(result.redirectForm?.fields.first_name).toBe('Saman');
    expect(result.redirectForm?.fields.notify_url).toContain('/webhooks/payhere');
    expect(result.redirectForm?.fields.hash).toBeTruthy();
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
      payment_id: '320025023469',
      md5sig: sig,
    }).toString();

    const result = await gateway.verifyWebhook({
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      rawBody: Buffer.from(body),
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('paid');
    expect(result.orderId).toBe(orderId);
    expect(result.gatewayTxnId).toBe('320025023469');
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

  it('verifyTransaction uses OAuth Bearer and maps RECEIVED to paid', async () => {
    fetchWithRetry
      .mockResolvedValueOnce({
        data: { access_token: 'tok-abc', expires_in: 599, token_type: 'bearer' },
        attempts: 1,
      })
      .mockResolvedValueOnce({
        data: {
          status: 1,
          msg: 'Found 1 payments',
          data: [
            {
              payment_id: 320025023469,
              order_id: 'ORD-001',
              status: 'RECEIVED',
              currency: 'LKR',
              amount: 1500,
              amount_detail: { currency: 'LKR', gross: 1500 },
            },
          ],
        },
        attempts: 1,
      });

    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();
    const result = await gateway.verifyTransaction('ORD-001');

    expect(result?.status).toBe('paid');
    expect(result?.amount).toBe(1500);
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);

    const oauthCall = fetchWithRetry.mock.calls[0];
    expect(String(oauthCall[0])).toContain('/merchant/v1/oauth/token');
    expect(oauthCall[1].headers.Authorization).toMatch(/^Basic /);

    const searchCall = fetchWithRetry.mock.calls[1];
    expect(String(searchCall[0])).toContain('/merchant/v1/payment/search?order_id=ORD-001');
    expect(searchCall[1].headers.Authorization).toBe('Bearer tok-abc');
  });

  it('refund posts payment_id with OAuth Bearer', async () => {
    fetchWithRetry
      .mockResolvedValueOnce({
        data: { access_token: 'tok-refund', expires_in: 599 },
        attempts: 1,
      })
      .mockResolvedValueOnce({
        data: { status: 1, msg: 'Refund requested' },
        attempts: 1,
      });

    const { PayHereGateway } = await import('@/services/gateways/payhere.gateway');
    const gateway = new PayHereGateway();
    const result = await gateway.refund({
      gatewayPaymentId: '320025023469',
      amount: 1500,
      reason: 'Out of stock',
    });

    expect(result.status).toBe('refunded');
    const refundCall = fetchWithRetry.mock.calls.at(-1);
    expect(String(refundCall?.[0])).toContain('/merchant/v1/payment/refund');
    expect(refundCall?.[1].headers.Authorization).toBe('Bearer tok-refund');
    expect(JSON.parse(refundCall?.[1].body as string)).toEqual({
      payment_id: '320025023469',
      description: 'Out of stock',
    });
  });
});
