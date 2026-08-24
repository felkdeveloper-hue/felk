import { generateKeyPairSync } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { hmacSha256Hex } from '@/utils/crypto.helper.js';
import { appConfig } from '@/config/app.config.js';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    app: { version: '0.1.0' },
    cors: { origins: ['http://localhost:5173'] },
    server: { apiPrefix: '/api/v1' },
    payment: {
      payhere: { merchantId: 'pm', merchantSecret: 'ps', mode: 'sandbox' },
      koko: {
        merchantId: 'koko-merchant',
        secretKey: 'koko-test-secret',
        apiKey: null,
        privateKey: undefined,
        privateKeyPath: null,
        publicKey: undefined,
        mode: 'sandbox',
      },
      mintpay: {
        merchantId: 'mintpay-merchant',
        secretKey: 'mintpay-test-secret',
        mode: 'sandbox',
        notifyUrl: 'https://api.fe.lk/api/v1/payments/webhooks/mintpay',
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
    const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
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

  it('accepts Paykoko form callback when public key is not configured', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
    const gateway = new KokoGateway();
    const body = new URLSearchParams({
      orderId: 'ORD-001',
      trnId: 'TX1',
      status: 'SUCCESS',
    }).toString();

    const result = await gateway.verifyWebhook({
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      rawBody: Buffer.from(body),
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('paid');
    expect(result.gatewayTxnId).toBe('TX1');
    expect(result.amount).toBeUndefined();
  });

  it('accepts SUCCESS callbacks when RSA verification cannot be confirmed', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
    const gateway = new KokoGateway();
    const koko = appConfig.payment.koko as { publicKey?: string };
    const previous = koko.publicKey;
    koko.publicKey =
      '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAL0=\n-----END PUBLIC KEY-----';
    try {
      const body = new URLSearchParams({
        orderId: 'PAY-MSSW5LLR-712AF7-A1',
        trnId: 'TX-LIVE',
        status: 'SUCCESS',
        signature: 'not-a-valid-signature',
      }).toString();
      const result = await gateway.verifyWebhook({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        rawBody: Buffer.from(body),
      });
      expect(result.valid).toBe(true);
      expect(result.status).toBe('paid');
      expect(result.orderId).toBe('PAY-MSSW5LLR-712AF7-A1');
    } finally {
      koko.publicKey = previous;
    }
  });

  it('accepts FAILED callbacks so insufficient-funds attempts are not left as processing', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
    const gateway = new KokoGateway();
    const body = new URLSearchParams({
      orderId: 'PAY-MT5U46JR-A9B8F7-A1',
      trnId: 'TX-FAIL',
      status: 'FAILED',
    }).toString();

    const result = await gateway.verifyWebhook({
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      rawBody: Buffer.from(body),
    });

    expect(result.valid).toBe(true);
    expect(result.status).toBe('failed');
    expect(result.orderId).toBe('PAY-MT5U46JR-A9B8F7-A1');
  });

  it('returns valid=false when orderId or status is missing', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
    const gateway = new KokoGateway();
    const result = await gateway.verifyWebhook({
      headers: {},
      rawBody: Buffer.from('status=SUCCESS'),
    });
    expect(result.valid).toBe(false);
  });

  it('never puts PEM material in customer-facing errors', async () => {
    const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
    const gateway = new KokoGateway();
    try {
      await gateway.createSession({
        orderId: 'ORD-KOKO-001',
        amount: 2000,
        currency: 'LKR',
        method: 'koko',
        customerEmail: 'test@example.com',
        returnUrl: 'https://example.com/return',
        cancelUrl: 'https://example.com/cancel',
        idempotencyKey: 'idem-koko-1',
      });
      throw new Error('expected createSession to reject');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).not.toMatch(/BEGIN/);
      expect(message).not.toMatch(/PRIVATE KEY/);
      expect(message).not.toMatch(/MII/);
    }
  });

  it('creates a signed Paykoko session from an inline PEM private key', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const koko = appConfig.payment.koko as {
      apiKey: string | null;
      merchantId: string;
      privateKey?: string;
      privateKeyPath: string | null;
    };
    const previous = { ...koko };
    koko.apiKey = 'test-api-key';
    koko.merchantId = 'koko-merchant';
    koko.privateKey = pem.replace(/\n/g, '\\n');
    koko.privateKeyPath = pem;

    try {
      const { KokoGateway } = await import('@/services/gateways/koko.gateway.js');
      const gateway = new KokoGateway();
      const result = await gateway.createSession({
        orderId: 'ORD-KOKO-LIVE',
        amount: 6162,
        currency: 'LKR',
        method: 'koko',
        customerEmail: 'test@example.com',
        returnUrl: 'https://fe.lk/checkout/return',
        cancelUrl: 'https://fe.lk/checkout/cancel',
        idempotencyKey: 'idem-koko-live',
      });
      expect(result.redirectForm?.action).toContain('paykoko.com');
      expect(String(result.redirectForm?.fields.signature ?? '')).toMatch(/^[A-Za-z0-9+/=]+$/);
      expect(result.redirectForm?.fields._pluginName).toBe('customapi');
      expect(String(result.redirectForm?.fields._returnUrl ?? '')).toContain(
        '/payments/webhooks/koko/return',
      );
    } finally {
      Object.assign(koko, previous);
    }
  });
});

describe('Mintpay gateway', () => {
  it('returns sandbox login form redirect with hashed success/fail URLs', async () => {
    const { fetchWithRetry } = await import('@/utils/http-retry.js');
    const { MintpayGateway } = await import('@/services/gateways/mintpay.gateway.js');
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
    expect(result.gatewayPaymentId).toBe('ORD-MP-001');
    expect(result.raw?.mode).toBe('sandbox');
    expect(result.raw?.purchaseId).toBe('purchase-abc');

    const posted = vi.mocked(fetchWithRetry).mock.calls.at(-1);
    const body = JSON.parse(
      String((posted?.[1] as { body?: string } | undefined)?.body ?? '{}'),
    ) as {
      success_url?: string;
      fail_url?: string;
    };
    expect(body.success_url).toContain('/payments/webhooks/mintpay');
    expect(body.success_url).toContain('orderId=ORD-MP-001');
    expect(body.success_url).toContain('hash=');
    expect(body.fail_url).toContain('orderId=ORD-MP-001');
  });

  it('builds WooCommerce-compatible success and fail hashes', async () => {
    const {
      mintpaySuccessHashMessage,
      mintpayFailHashMessage,
      mintpayBrowserReturnHash,
      decodeMintpayBrowserHash,
    } = await import('@/services/gateways/mintpay.gateway.js');

    const successMsg = mintpaySuccessHashMessage('PAY-ABC-A1', 11349);
    expect(successMsg).toBe('mintpay-merchant11349.00PAY-ABC-A1');
    const encoded = mintpayBrowserReturnHash(successMsg);
    expect(decodeMintpayBrowserHash(encoded)).toBe(
      hmacSha256Hex('mintpay-test-secret', successMsg),
    );
    expect(mintpayFailHashMessage('PAY-ABC-A1')).toBe('PAY-ABC-A1');
  });

  it('returns valid=true with correct HMAC', async () => {
    const { MintpayGateway } = await import('@/services/gateways/mintpay.gateway.js');
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
    const { MintpayGateway } = await import('@/services/gateways/mintpay.gateway.js');
    const gateway = new MintpayGateway();
    const body = JSON.stringify({ status: 'success' });
    const result = await gateway.verifyWebhook({
      headers: { 'x-mintpay-signature': 'badsig' },
      rawBody: Buffer.from(body),
    });
    expect(result.valid).toBe(false);
  });
});
