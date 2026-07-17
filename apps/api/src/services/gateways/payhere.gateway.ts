import { appConfig } from '@/config/app.config';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';
import { md5Hex } from '@/utils/crypto.helper';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service';
import { getHeader, parseWebhookPayload } from '@/services/gateways/gateway.utils';

/** PayHere status_code -> our verification status mapping. */
const STATUS_CODE_MAP: Record<string, string> = {
  '2': PAYMENT_STATUS.PAID, // success
  '0': PAYMENT_STATUS.PROCESSING, // pending
  '-1': PAYMENT_STATUS.CANCELLED, // canceled by user
  '-2': PAYMENT_STATUS.FAILED, // failed
  '-3': PAYMENT_STATUS.REFUNDED, // chargedback
};

function hashSecret(): string {
  return md5Hex(appConfig.payment.payhere.merchantSecret);
}

/** PayHere merchant checkout hash: MD5(merchant_id + order_id + amount + currency + MD5(secret)). */
function buildRequestHash(orderId: string, amount: string, currency: string): string {
  const merchantId = appConfig.payment.payhere.merchantId;
  return md5Hex(`${merchantId}${orderId}${amount}${currency}${hashSecret()}`);
}

/** PayHere webhook signature: MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret)). */
function buildNotifyHash(
  orderId: string,
  amount: string,
  currency: string,
  statusCode: string,
): string {
  const merchantId = appConfig.payment.payhere.merchantId;
  return md5Hex(`${merchantId}${orderId}${amount}${currency}${statusCode}${hashSecret()}`);
}

export class PayHereGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.PAYHERE;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const amount = input.amount.toFixed(2);
    const hash = buildRequestHash(input.orderId, amount, input.currency);
    const base =
      appConfig.payment.payhere.mode === 'live'
        ? 'https://www.payhere.lk/pay/checkout'
        : 'https://sandbox.payhere.lk/pay/checkout';

    const params = new URLSearchParams({
      merchant_id: appConfig.payment.payhere.merchantId,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      order_id: input.orderId,
      items: `Order ${input.orderId}`,
      currency: input.currency,
      amount,
      email: input.customerEmail,
      hash,
    });

    return {
      gatewayPaymentId: input.orderId,
      redirectUrl: `${base}?${params.toString()}`,
      raw: { merchantId: appConfig.payment.payhere.merchantId, hash },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const payload = parseWebhookPayload(input.rawBody);
    const merchantId = String(payload.merchant_id ?? '');
    const orderId = String(payload.order_id ?? '');
    const payhereAmount = String(payload.payhere_amount ?? '');
    const payhereCurrency = String(payload.payhere_currency ?? '');
    const statusCode = String(payload.status_code ?? '');
    const receivedSig = String(payload.md5sig ?? getHeader(input.headers, 'md5sig') ?? '');

    if (!merchantId || !orderId || !statusCode || !receivedSig) {
      return { valid: false, payload };
    }

    if (merchantId !== appConfig.payment.payhere.merchantId) {
      return { valid: false, payload };
    }

    const expectedSig = buildNotifyHash(orderId, payhereAmount, payhereCurrency, statusCode);
    if (expectedSig !== receivedSig.toUpperCase()) {
      return { valid: false, payload };
    }

    return {
      valid: true,
      gatewayTxnId: String(payload.payment_id ?? orderId),
      orderId,
      status: STATUS_CODE_MAP[statusCode] ?? PAYMENT_STATUS.FAILED,
      amount: Number(payhereAmount),
      currency: payhereCurrency,
      payload,
    };
  }
}

export const payHereGateway = new PayHereGateway();
