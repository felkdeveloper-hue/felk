import { randomBytes } from 'node:crypto';
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

const MINTPAY_STATUS_MAP: Record<string, string> = {
  success: PAYMENT_STATUS.PAID,
  paid: PAYMENT_STATUS.PAID,
  pending: PAYMENT_STATUS.PROCESSING,
  rejected: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
  expired: PAYMENT_STATUS.EXPIRED,
};

function mintpayApiBase(): string {
  return appConfig.payment.mintpay.mode === 'live'
    ? 'https://api.mintpay.lk/v1'
    : 'https://sandbox.api.mintpay.lk/v1';
}

function mintpayCheckoutBase(): string {
  return appConfig.payment.mintpay.mode === 'live'
    ? 'https://checkout.mintpay.lk/pay'
    : 'https://sandbox.checkout.mintpay.lk/pay';
}

export class MintpayGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.MINTPAY;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `mintpay_${input.orderId}_${randomBytes(4).toString('hex')}`;
    const { merchantId, secretKey } = appConfig.payment.mintpay;

    if (
      secretKey &&
      secretKey !== 'dev-mintpay-secret-key' &&
      secretKey !== 'dev-mintpay-merchant-secret'
    ) {
      try {
        return await this.createSessionViaApi(input, gatewayPaymentId, merchantId, secretKey);
      } catch (err) {
        logger.warn(
          { gateway: 'mintpay', orderId: input.orderId, err },
          'Mintpay: API session creation failed, falling back to redirect',
        );
      }
    }

    return this.fallbackSession(input, gatewayPaymentId, merchantId);
  }

  private async createSessionViaApi(
    input: CreatePaymentSessionInput,
    gatewayPaymentId: string,
    merchantId: string,
    secretKey: string,
  ): Promise<PaymentSessionResult> {
    const body = JSON.stringify({
      merchantId,
      orderId: input.orderId,
      ref: gatewayPaymentId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      customerEmail: input.customerEmail,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      metadata: { idempotencyKey: input.idempotencyKey },
    });

    const signature = hmacSha256Hex(secretKey, body);

    const { data } = await fetchWithRetry<{ checkoutUrl?: string; sessionId?: string }>(
      `${mintpayApiBase()}/checkout/session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mintpay-Merchant': merchantId,
          'X-Mintpay-Signature': signature,
        },
        body,
      },
    );

    const redirectUrl =
      data.checkoutUrl ?? `${mintpayCheckoutBase()}/${data.sessionId ?? gatewayPaymentId}`;

    logger.info(
      {
        gateway: 'mintpay',
        orderId: input.orderId,
        mode: appConfig.payment.mintpay.mode,
        gatewayPaymentId: data.sessionId ?? gatewayPaymentId,
      },
      'Mintpay: checkout session created via API',
    );

    return {
      gatewayPaymentId: data.sessionId ?? gatewayPaymentId,
      redirectUrl,
      raw: { sessionId: data.sessionId, merchantId, mode: appConfig.payment.mintpay.mode },
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

    const base = mintpayCheckoutBase();

    logger.info(
      {
        gateway: 'mintpay',
        orderId: input.orderId,
        mode: appConfig.payment.mintpay.mode,
        fallback: true,
      },
      'Mintpay: using fallback redirect (credentials not configured)',
    );

    return {
      gatewayPaymentId,
      redirectUrl: `${base}?${params.toString()}`,
      raw: { merchantId, mode: appConfig.payment.mintpay.mode, fallback: true },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const signature = getHeader(input.headers, 'x-mintpay-signature');
    if (!signature) {
      logger.warn({ gateway: 'mintpay' }, 'Mintpay: webhook missing x-mintpay-signature header');
      return { valid: false };
    }

    const expected = hmacSha256Hex(
      appConfig.payment.mintpay.secretKey,
      rawBodyToString(input.rawBody),
    );
    if (!safeCompare(expected, signature)) {
      logger.warn({ gateway: 'mintpay' }, 'Mintpay: webhook HMAC signature mismatch');
      return { valid: false };
    }

    const payload = parseWebhookPayload(input.rawBody);
    const status = String(payload.status ?? '').toLowerCase();
    const mappedStatus = MINTPAY_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED;

    logger.info(
      { gateway: 'mintpay', orderId: payload.orderId, status, mappedStatus },
      'Mintpay: webhook verified',
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

export const mintpayGateway = new MintpayGateway();
