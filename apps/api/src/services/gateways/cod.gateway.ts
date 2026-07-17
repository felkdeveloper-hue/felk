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

const COD_STATUS_MAP: Record<string, string> = {
  collected: PAYMENT_STATUS.PAID,
  paid: PAYMENT_STATUS.PAID,
  refused: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
};

/**
 * Cash On Delivery — there is no external payment gateway. The "webhook" is
 * an internal, HMAC-signed notification from the delivery/logistics service
 * confirming cash was collected (or refused) at the doorstep. No redirect is
 * ever issued; the payment stays PROCESSING until that confirmation lands.
 */
export class CodGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.COD;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    return {
      gatewayPaymentId: input.orderId,
      redirectUrl: undefined,
      raw: { note: 'Cash on delivery — no gateway redirect required' },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const signature = getHeader(input.headers, 'x-cod-signature');
    if (!signature) return { valid: false };

    const expected = hmacSha256Hex(
      appConfig.payment.cod.webhookSecret,
      rawBodyToString(input.rawBody),
    );
    if (!safeCompare(expected, signature)) {
      return { valid: false };
    }

    const payload = parseWebhookPayload(input.rawBody);
    const status = String(payload.status ?? '').toLowerCase();

    return {
      valid: true,
      gatewayTxnId: String(payload.collectionId ?? payload.orderId ?? ''),
      orderId: String(payload.orderId ?? ''),
      status: COD_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const codGateway = new CodGateway();
