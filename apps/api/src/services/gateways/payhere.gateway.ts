import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';
import { md5Hex } from '@/utils/crypto.helper';
import { fetchWithRetry } from '@/utils/http-retry';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service';
import { getHeader, parseWebhookPayload } from '@/services/gateways/gateway.utils';

/** PayHere status_code -> our verification status mapping. */
const STATUS_CODE_MAP: Record<string, string> = {
  '2': PAYMENT_STATUS.PAID,
  '0': PAYMENT_STATUS.PROCESSING,
  '-1': PAYMENT_STATUS.CANCELLED,
  '-2': PAYMENT_STATUS.FAILED,
  '-3': PAYMENT_STATUS.REFUNDED,
};

function hashSecret(): string {
  return md5Hex(appConfig.payment.payhere.merchantSecret);
}

function baseUrl(): string {
  return appConfig.payment.payhere.mode === 'live'
    ? 'https://www.payhere.lk'
    : 'https://sandbox.payhere.lk';
}

function checkoutUrl(): string {
  return `${baseUrl()}/pay/checkout`;
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
    const base = checkoutUrl();

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

    const redirectUrl = `${base}?${params.toString()}`;

    logger.info(
      {
        gateway: 'payhere',
        orderId: input.orderId,
        amount,
        currency: input.currency,
        mode: appConfig.payment.payhere.mode,
      },
      'PayHere: session created',
    );

    return {
      gatewayPaymentId: input.orderId,
      redirectUrl,
      raw: {
        merchantId: appConfig.payment.payhere.merchantId,
        hash,
        mode: appConfig.payment.payhere.mode,
      },
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

    logger.info(
      { gateway: 'payhere', orderId, statusCode, merchantId },
      'PayHere: webhook received',
    );

    if (!merchantId || !orderId || !statusCode || !receivedSig) {
      logger.warn({ gateway: 'payhere', orderId }, 'PayHere: webhook missing required fields');
      return { valid: false, payload };
    }

    if (merchantId !== appConfig.payment.payhere.merchantId) {
      logger.warn(
        {
          gateway: 'payhere',
          received: merchantId,
          expected: appConfig.payment.payhere.merchantId,
        },
        'PayHere: merchant ID mismatch',
      );
      return { valid: false, payload };
    }

    const expectedSig = buildNotifyHash(orderId, payhereAmount, payhereCurrency, statusCode);
    if (expectedSig !== receivedSig.toUpperCase()) {
      logger.warn({ gateway: 'payhere', orderId }, 'PayHere: webhook signature mismatch');
      return { valid: false, payload };
    }

    const status = STATUS_CODE_MAP[statusCode] ?? PAYMENT_STATUS.FAILED;
    logger.info({ gateway: 'payhere', orderId, statusCode, status }, 'PayHere: webhook verified');

    return {
      valid: true,
      gatewayTxnId: String(payload.payment_id ?? orderId),
      orderId,
      status,
      amount: Number(payhereAmount),
      currency: payhereCurrency,
      payload,
    };
  }

  /**
   * Defense-in-depth: fetch the payment status server-to-server from PayHere.
   * This is a read-only verification call — never authoritative over a verified webhook.
   */
  async verifyTransaction(
    orderId: string,
  ): Promise<{ status: string; amount?: number; currency?: string } | null> {
    const merchantId = appConfig.payment.payhere.merchantId;
    const secretHash = hashSecret();
    const verifyHash = md5Hex(`${merchantId}${secretHash}`);

    const apiBase =
      appConfig.payment.payhere.mode === 'live'
        ? 'https://www.payhere.lk'
        : 'https://sandbox.payhere.lk';

    const url = `${apiBase}/merchant/v1/payment/search?order_id=${encodeURIComponent(orderId)}`;

    try {
      const { data } = await fetchWithRetry<Record<string, unknown>>(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${merchantId}:${verifyHash}`).toString('base64')}`,
          Accept: 'application/json',
        },
      });

      const statusRaw = String((data as Record<string, unknown>).status ?? '');
      logger.info(
        { gateway: 'payhere', orderId, statusRaw },
        'PayHere: transaction verification response',
      );

      return {
        status: STATUS_CODE_MAP[statusRaw] ?? PAYMENT_STATUS.FAILED,
        amount: Number((data as Record<string, unknown>).amount ?? 0),
        currency: String((data as Record<string, unknown>).currency ?? ''),
      };
    } catch (err) {
      logger.warn({ gateway: 'payhere', orderId, err }, 'PayHere: transaction verification failed');
      return null;
    }
  }
}

export const payHereGateway = new PayHereGateway();
