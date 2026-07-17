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

const KOKO_STATUS_MAP: Record<string, string> = {
  approved: PAYMENT_STATUS.PAID,
  completed: PAYMENT_STATUS.PAID,
  pending: PAYMENT_STATUS.PROCESSING,
  declined: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
  expired: PAYMENT_STATUS.EXPIRED,
};

/**
 * Koko (BNPL) adapter. No public sandbox is wired up here — `createSession`
 * builds a merchant-hosted checkout reference the way Koko's API contract
 * expects; swap the TODO for a real HTTP call once credentials are issued.
 */
export class KokoGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.KOKO;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `koko_${input.orderId}_${randomBytes(4).toString('hex')}`;

    // TODO(integration): POST to Koko's order-create API with merchantId/secretKey
    // once sandbox credentials are available; for now we deterministically build
    // the redirect the same way their hosted checkout expects.
    const params = new URLSearchParams({
      merchantId: appConfig.payment.koko.merchantId,
      orderId: input.orderId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      ref: gatewayPaymentId,
    });

    return {
      gatewayPaymentId,
      redirectUrl: `https://checkout.koko.lk/pay?${params.toString()}`,
      raw: { merchantId: appConfig.payment.koko.merchantId },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const signature = getHeader(input.headers, 'x-koko-signature');
    if (!signature) return { valid: false };

    const expected = hmacSha256Hex(
      appConfig.payment.koko.secretKey,
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
      status: KOKO_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const kokoGateway = new KokoGateway();
