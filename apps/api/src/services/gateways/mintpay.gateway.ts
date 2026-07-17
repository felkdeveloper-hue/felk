import { randomBytes } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper';
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

/**
 * Mintpay (BNPL) adapter — same shape as Koko: HMAC-SHA256 signed webhooks
 * over the raw request body, shared secret from merchant dashboard.
 */
export class MintpayGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.MINTPAY;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `mintpay_${input.orderId}_${randomBytes(4).toString('hex')}`;

    // TODO(integration): POST to Mintpay's order-create API once sandbox
    // credentials are issued; redirect shape below matches their documented
    // hosted-checkout query parameters.
    const params = new URLSearchParams({
      merchantId: appConfig.payment.mintpay.merchantId,
      orderId: input.orderId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      ref: gatewayPaymentId,
    });

    return {
      gatewayPaymentId,
      redirectUrl: `https://checkout.mintpay.lk/pay?${params.toString()}`,
      raw: { merchantId: appConfig.payment.mintpay.merchantId },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const signature = getHeader(input.headers, 'x-mintpay-signature');
    if (!signature) return { valid: false };

    const expected = hmacSha256Hex(
      appConfig.payment.mintpay.secretKey,
      rawBodyToString(input.rawBody),
    );
    if (!safeCompare(expected, signature)) {
      return { valid: false };
    }

    const payload = parseWebhookPayload(input.rawBody);
    const status = String(payload.status ?? '').toLowerCase();

    return {
      valid: true,
      gatewayTxnId: String(payload.transactionId ?? payload.ref ?? ''),
      orderId: String(payload.orderId ?? ''),
      status: MINTPAY_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const mintpayGateway = new MintpayGateway();
