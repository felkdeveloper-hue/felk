import { randomBytes } from 'node:crypto';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper';
import { fetchWithRetry, HttpRetryError } from '@/utils/http-retry';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service';
import { getHeader, parseWebhookPayload, rawBodyToString } from '@/services/gateways/gateway.utils';
import { ApiError } from '@/utils/errors/api-error';

const MINTPAY_STATUS_MAP: Record<string, string> = {
  success: PAYMENT_STATUS.PAID,
  paid: PAYMENT_STATUS.PAID,
  pending: PAYMENT_STATUS.PROCESSING,
  rejected: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
  expired: PAYMENT_STATUS.EXPIRED,
};

/** Real Mintpay hosts (from official WooCommerce plugin). */
function mintpayHosts() {
  return appConfig.payment.mintpay.mode === 'live'
    ? {
        api: 'https://app.mintpay.lk/user-order/api/',
        login: 'https://app.mintpay.lk/user-order/login/',
      }
    : {
        api: 'https://dev.mintpay.lk/user-order/api/',
        login: 'https://dev.mintpay.lk/user-order/login/',
      };
}

export class MintpayGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.MINTPAY;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `mintpay_${input.orderId}_${randomBytes(4).toString('hex')}`;
    const { merchantId, secretKey } = appConfig.payment.mintpay;

    if (
      !secretKey ||
      secretKey === 'dev-mintpay-secret-key' ||
      secretKey === 'dev-mintpay-merchant-secret' ||
      !merchantId ||
      merchantId === 'dev-mintpay-merchant-id'
    ) {
      throw ApiError.badRequest(
        'Mintpay is not configured. Set MINTPAY_MERCHANT_ID and MINTPAY_MERCHANT_SECRET.',
        undefined,
        'MINTPAY_NOT_CONFIGURED',
      );
    }

    const hosts = mintpayHosts();
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19).replace('T', ' ');
    const productLabel =
      typeof input.metadata?.description === 'string'
        ? input.metadata.description
        : `Order ${input.orderId}`;

    const body = JSON.stringify({
      merchant_id: merchantId,
      order_id: input.orderId,
      total_price: input.amount,
      discount: 0,
      customer_id: String(input.metadata?.customerId ?? ''),
      customer_email: input.customerEmail,
      customer_telephone: String(input.metadata?.customerPhone ?? ''),
      ip: String(input.metadata?.ip ?? ''),
      x_forwarded_for: String(input.metadata?.ip ?? ''),
      delivery_street: String(input.metadata?.deliveryStreet ?? ''),
      delivery_region: String(input.metadata?.deliveryRegion ?? ''),
      delivery_postcode: String(input.metadata?.deliveryPostcode ?? ''),
      cart_created_date: stamp,
      cart_updated_date: stamp,
      success_url: input.returnUrl,
      fail_url: input.cancelUrl,
      products: [
        {
          name: productLabel,
          product_id: input.orderId,
          sku: input.orderId,
          quantity: '1',
          unit_price: input.amount.toFixed(2),
          discount: '0.00',
        },
      ],
      currency_code: input.currency,
      currency_symbol: input.currency === 'LKR' ? 'Rs' : input.currency,
    });

    let data: { message?: string; data?: string };
    try {
      const result = await fetchWithRetry<{ message?: string; data?: string }>(
        hosts.api,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${secretKey}`,
            'Content-Type': 'application/json',
            'User-Agent': `FE-Platform/${appConfig.app.version}; ${appConfig.cors.origins[0] ?? 'http://localhost:5173'}`,
          },
          body,
        },
        { maxAttempts: 2 },
      );
      data = result.data;
    } catch (err) {
      const status = err instanceof HttpRetryError ? err.lastStatus : undefined;
      logger.warn(
        { gateway: 'mintpay', orderId: input.orderId, status, err },
        'Mintpay: order API request failed',
      );
      throw ApiError.badRequest(
        status === 403
          ? 'Mintpay rejected the request (403). Check MINTPAY_MERCHANT_ID / MINTPAY_MERCHANT_SECRET are valid sandbox credentials from Mintpay.'
          : 'Mintpay could not create a checkout session. Check merchant credentials and network access to dev.mintpay.lk.',
        { status, message: err instanceof Error ? err.message : String(err) },
        'MINTPAY_SESSION_FAILED',
      );
    }

    if (data.message !== 'Success' || !data.data) {
      logger.warn(
        { gateway: 'mintpay', orderId: input.orderId, response: data },
        'Mintpay: order API rejected request',
      );
      throw ApiError.badRequest(
        'Mintpay could not create a checkout session. Check merchant credentials.',
        { response: data },
        'MINTPAY_SESSION_FAILED',
      );
    }

    const purchaseId = String(data.data);

    logger.info(
      {
        gateway: 'mintpay',
        orderId: input.orderId,
        mode: appConfig.payment.mintpay.mode,
        purchaseId,
      },
      'Mintpay: checkout session created',
    );

    return {
      gatewayPaymentId: purchaseId || gatewayPaymentId,
      redirectUrl: hosts.login,
      redirectForm: {
        action: hosts.login,
        method: 'POST',
        fields: { purchase_id: purchaseId },
      },
      raw: { purchaseId, merchantId, mode: appConfig.payment.mintpay.mode },
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
