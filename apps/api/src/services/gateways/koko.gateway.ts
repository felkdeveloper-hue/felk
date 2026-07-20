import { createSign, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper';
import { fetchWithRetry } from '@/utils/http-retry';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service';
import { getHeader, parseWebhookPayload, rawBodyToString } from '@/services/gateways/gateway.utils';

const KOKO_STATUS_MAP: Record<string, string> = {
  approved: PAYMENT_STATUS.PAID,
  completed: PAYMENT_STATUS.PAID,
  pending: PAYMENT_STATUS.PROCESSING,
  declined: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
  expired: PAYMENT_STATUS.EXPIRED,
};

const KOKO_API_BASE = 'https://api.koko.lk/v1';

function loadPrivateKey(): string | null {
  const keyPath = appConfig.payment.koko.privateKeyPath;
  if (!keyPath) return null;
  try {
    const absPath = resolve(process.cwd(), keyPath);
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

function buildRequestSignature(payload: string, privateKey: string): string {
  const sign = createSign('RSA-SHA256');
  sign.update(payload);
  return sign.sign(privateKey, 'base64');
}

export class KokoGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.KOKO;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `koko_${input.orderId}_${randomBytes(4).toString('hex')}`;
    const { apiKey, merchantId, privateKeyPath } = appConfig.payment.koko;

    if (apiKey && privateKeyPath) {
      const privateKey = loadPrivateKey();
      if (privateKey) {
        return this.createSessionViaApi(input, gatewayPaymentId, apiKey, merchantId, privateKey);
      }
      logger.warn(
        { gateway: 'koko', privateKeyPath },
        'Koko: private key file not found, falling back to redirect-only mode',
      );
    }

    return this.fallbackSession(input, gatewayPaymentId, merchantId);
  }

  private async createSessionViaApi(
    input: CreatePaymentSessionInput,
    gatewayPaymentId: string,
    apiKey: string,
    merchantId: string,
    privateKey: string,
  ): Promise<PaymentSessionResult> {
    const installmentPlans = (input.metadata?.installmentPlans as number[] | undefined) ?? [];

    const body = JSON.stringify({
      merchantId,
      orderId: input.orderId,
      ref: gatewayPaymentId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      customerEmail: input.customerEmail,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      ...(installmentPlans.length > 0 && { installmentPlans }),
      metadata: { idempotencyKey: input.idempotencyKey },
    });

    const signature = buildRequestSignature(body, privateKey);

    const { data } = await fetchWithRetry<{
      checkoutUrl?: string;
      sessionId?: string;
      ref?: string;
    }>(`${KOKO_API_BASE}/checkout/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Koko-Signature': signature,
        'X-Koko-Merchant': merchantId,
      },
      body,
    });

    const redirectUrl =
      data.checkoutUrl ?? `https://checkout.koko.lk/pay/${data.sessionId ?? gatewayPaymentId}`;

    logger.info(
      {
        gateway: 'koko',
        orderId: input.orderId,
        gatewayPaymentId,
        hasRedirect: Boolean(data.checkoutUrl),
      },
      'Koko: checkout session created via API',
    );

    return {
      gatewayPaymentId: data.sessionId ?? gatewayPaymentId,
      redirectUrl,
      raw: { sessionId: data.sessionId, merchantId },
    };
  }

  private fallbackSession(
    input: CreatePaymentSessionInput,
    gatewayPaymentId: string,
    merchantId: string,
  ): PaymentSessionResult {
    const params = new URLSearchParams({
      merchantId,
      orderId: input.orderId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      ref: gatewayPaymentId,
    });

    logger.info(
      { gateway: 'koko', orderId: input.orderId, mode: 'redirect-only' },
      'Koko: using fallback redirect (API key or private key not configured)',
    );

    return {
      gatewayPaymentId,
      redirectUrl: `https://checkout.koko.lk/pay?${params.toString()}`,
      raw: { merchantId, mode: 'fallback' },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const signature = getHeader(input.headers, 'x-koko-signature');
    if (!signature) {
      logger.warn({ gateway: 'koko' }, 'Koko: webhook missing x-koko-signature header');
      return { valid: false };
    }

    const expected = hmacSha256Hex(
      appConfig.payment.koko.secretKey,
      rawBodyToString(input.rawBody),
    );
    if (!safeCompare(expected, signature)) {
      logger.warn({ gateway: 'koko' }, 'Koko: webhook HMAC signature mismatch');
      return { valid: false };
    }

    const payload = parseWebhookPayload(input.rawBody);
    const status = String(payload.status ?? '').toLowerCase();
    const mappedStatus = KOKO_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED;

    logger.info(
      { gateway: 'koko', orderId: payload.orderId, status, mappedStatus },
      'Koko: webhook verified',
    );

    return {
      valid: true,
      gatewayTxnId: String(payload.transactionId ?? payload.ref ?? ''),
      orderId: String(payload.orderId ?? ''),
      status: mappedStatus,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const kokoGateway = new KokoGateway();
