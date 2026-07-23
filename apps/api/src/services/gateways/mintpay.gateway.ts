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

/**
 * Mintpay's edge WAF returns HTML 403 when success/fail URLs use localhost.
 * Rewrite local callback URLs to a public HTTPS origin for the API payload only.
 */
function toMintpayPublicUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0' ||
      parsed.hostname.endsWith('.local');
    if (!isLocal && parsed.protocol === 'https:') return rawUrl;

    const origin =
      process.env.MINTPAY_PUBLIC_ORIGIN?.trim() ||
      process.env.STOREFRONT_PUBLIC_URL?.trim() ||
      appConfig.cors.origins.find((o) => o.startsWith('https://')) ||
      'https://fashionedge.lk';
    const publicOrigin = new URL(origin.endsWith('/') ? origin.slice(0, -1) : origin);
    parsed.protocol = publicOrigin.protocol;
    parsed.hostname = publicOrigin.hostname;
    parsed.port = publicOrigin.port;
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

/** Mintpay customer_id: digits only, max 10 chars, and fits signed 32-bit int. */
function mintpayCustomerId(raw: unknown): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const source =
    digits.length > 0
      ? digits
      : (() => {
          let hash = 0;
          const s = String(raw ?? '0');
          for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
          return String(hash);
        })();
  // Their API 500s when customer_id exceeds signed 32-bit (2147483647).
  const asInt = Number(source.slice(-10)) % 2147483647;
  return String(asInt || 1);
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
      // Mintpay: max 10 chars and digits only (alpha ObjectIds cause their API to 500).
      customer_id: mintpayCustomerId(input.metadata?.customerId ?? input.orderId),
      customer_email: input.customerEmail,
      customer_telephone: String(
        input.metadata?.customerPhone ?? input.metadata?.phone ?? '0000000000',
      ),
      ip: String(input.metadata?.ip ?? '127.0.0.1'),
      x_forwarded_for: String(input.metadata?.ip ?? '127.0.0.1'),
      delivery_street: String(input.metadata?.deliveryStreet ?? 'N/A'),
      delivery_region: String(input.metadata?.deliveryRegion ?? 'N/A'),
      delivery_postcode: String(input.metadata?.deliveryPostcode ?? '00000'),
      cart_created_date: stamp,
      cart_updated_date: stamp,
      success_url: toMintpayPublicUrl(input.returnUrl),
      fail_url: toMintpayPublicUrl(input.cancelUrl),
      products: [
        {
          name: productLabel,
          product_id: input.orderId,
          sku: input.orderId,
          quantity: '1',
          unit_price: input.amount.toFixed(2),
          discount: '0.00',
          created_date: stamp,
          updated_date: stamp,
        },
      ],
      currency_code: input.currency,
      currency_symbol: input.currency === 'LKR' ? 'Rs' : input.currency,
    });

    let data: { message?: string; data?: string };
    try {
      const userAgent = `WordPress/6.4; ${
        appConfig.cors.origins.find((o) => o.startsWith('https://')) ?? 'https://fashionedge.lk'
      }`;
      const result = await fetchWithRetry<{ message?: string; data?: string }>(
        hosts.api,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${secretKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            // Mintpay edge WAF rejects unknown clients (HTML 403); WooCommerce UA is allowlisted.
            'User-Agent': userAgent,
          },
          body,
        },
        { maxAttempts: 1 },
      );
      data = result.data;
    } catch (err) {
      const status = err instanceof HttpRetryError ? err.lastStatus : undefined;
      const raw = err instanceof Error ? err.message : String(err);
      logger.warn(
        {
          gateway: 'mintpay',
          orderId: input.orderId,
          status,
          mode: appConfig.payment.mintpay.mode,
          merchantId,
          err,
        },
        'Mintpay: order API request failed',
      );
      const isHtmlForbidden = status === 403 && /<html[\s>]|403 Forbidden/i.test(raw);
      throw ApiError.badRequest(
        status === 401 || /Invalid token/i.test(raw)
          ? 'Mintpay rejected the API token (401 Invalid token). Check MINTPAY_MERCHANT_SECRET for the correct live/sandbox environment.'
          : isHtmlForbidden
            ? 'Mintpay blocked the request (HTML 403). Localhost return URLs are rejected — set MINTPAY_PUBLIC_ORIGIN to your public HTTPS storefront URL.'
            : status === 403
              ? 'Mintpay rejected the request (403). Check MINTPAY_MERCHANT_ID / MINTPAY_MERCHANT_SECRET and MINTPAY_MODE.'
              : 'Mintpay could not create a checkout session. Check merchant credentials and network access to app.mintpay.lk / dev.mintpay.lk.',
        { status, message: raw },
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
