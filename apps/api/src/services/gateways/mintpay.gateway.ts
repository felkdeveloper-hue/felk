import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status.js';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper.js';
import { fetchWithRetry, HttpRetryError } from '@/utils/http-retry.js';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service.js';
import {
  getHeader,
  normalizeMintpayCustomerId,
  normalizeMintpayTelephone,
  parseWebhookPayload,
  rawBodyToString,
  resolveMintpayEmail,
} from '@/services/gateways/gateway.utils.js';
import { ApiError } from '@/utils/errors/api-error.js';

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

/** Mintpay customer_id: digits only, max 10 chars, and fits signed 32-bit int. */
function mintpayCustomerId(raw: unknown): string {
  return normalizeMintpayCustomerId(raw);
}

/** PHP `sprintf("%.02f", round($amount, 2))` — used in WooCommerce return hashes. */
export function mintpayAmountString(amount: number): string {
  return (Math.round(Number(amount) * 100) / 100).toFixed(2);
}

/** HMAC hex then Base64, matching `base64_encode(hash_hmac('sha256', ...))`. */
export function mintpayBrowserReturnHash(
  message: string,
  secretKey = appConfig.payment.mintpay.secretKey,
): string {
  return Buffer.from(hmacSha256Hex(secretKey, message), 'utf8').toString('base64');
}

export function mintpaySuccessHashMessage(
  orderId: string,
  amount: number,
  merchantId = appConfig.payment.mintpay.merchantId,
): string {
  return `${merchantId}${mintpayAmountString(amount)}${orderId}`;
}

export function mintpayFailHashMessage(orderId: string): string {
  return orderId;
}

export function decodeMintpayBrowserHash(hash: string): string {
  try {
    return Buffer.from(String(hash).replace(/ /g, '+'), 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function mintpayNotifyUrl(): string {
  const configured = String(appConfig.payment.mintpay.notifyUrl ?? '').trim();
  try {
    const parsed = new URL(configured);
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0';
    if (!isLocal && parsed.protocol === 'https:') return configured;
  } catch {
    /* fall through */
  }
  return 'https://api.fe.lk/api/v1/payments/webhooks/mintpay';
}

function mintpayBrowserReturnUrl(orderId: string, hash: string): string {
  const url = new URL(mintpayNotifyUrl());
  url.searchParams.set('orderId', orderId);
  url.searchParams.set('hash', hash);
  return url.toString();
}

export class MintpayGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.MINTPAY;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
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
      customer_email: resolveMintpayEmail(input.customerEmail, input.metadata),
      customer_telephone: normalizeMintpayTelephone(
        input.metadata?.customerPhone ?? input.metadata?.phone ?? '0771234567',
      ),
      ip: String(input.metadata?.ip ?? '127.0.0.1'),
      x_forwarded_for: String(input.metadata?.ip ?? '127.0.0.1'),
      delivery_street: String(input.metadata?.deliveryStreet ?? 'N/A'),
      delivery_region: String(input.metadata?.deliveryRegion ?? 'N/A'),
      delivery_postcode: String(input.metadata?.deliveryPostcode ?? '00000'),
      cart_created_date: stamp,
      cart_updated_date: stamp,
      // WooCommerce plugin: Mintpay GETs these URLs with orderId+hash. No IPN webhook.
      success_url: mintpayBrowserReturnUrl(
        input.orderId,
        mintpayBrowserReturnHash(mintpaySuccessHashMessage(input.orderId, input.amount)),
      ),
      fail_url: mintpayBrowserReturnUrl(
        input.orderId,
        mintpayBrowserReturnHash(mintpayFailHashMessage(input.orderId)),
      ),
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
        appConfig.cors.origins.find((o) => o.includes('fe.lk') && o.startsWith('https://')) ??
        appConfig.email?.shopUrl?.replace(/\/$/, '') ??
        'https://fe.lk'
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
      const mintpayValidation =
        status === 400 && /customer_email|Ensure this field/i.test(raw)
          ? 'Mintpay rejected the customer email (max 40 characters). Guest checkout uses a shortened fe.lk alias automatically — redeploy the latest API if you still see this.'
          : null;
      throw ApiError.badRequest(
        status === 401 || /Invalid token/i.test(raw)
          ? 'Mintpay rejected the API token (401 Invalid token). Check MINTPAY_MERCHANT_SECRET for the correct live/sandbox environment.'
          : (mintpayValidation ??
              (isHtmlForbidden
                ? 'Mintpay blocked the request (HTML 403). Localhost return URLs are rejected — set MINTPAY_PUBLIC_ORIGIN=https://fe.lk (or your live storefront HTTPS URL).'
                : status === 403
                  ? 'Mintpay rejected the request (403). Check MINTPAY_MERCHANT_ID / MINTPAY_MERCHANT_SECRET and MINTPAY_MODE.'
                  : 'Mintpay could not create a checkout session. Check merchant credentials and network access to app.mintpay.lk / dev.mintpay.lk.')),
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
      // Store our attempt order id so the browser-return callback can look it up
      // (PayHere does the same). Mintpay's purchase_id is kept in raw/metadata.
      gatewayPaymentId: input.orderId,
      redirectUrl: hosts.login,
      redirectForm: {
        action: hosts.login,
        method: 'POST',
        fields: { purchase_id: purchaseId },
      },
      raw: {
        purchaseId,
        merchantId,
        mode: appConfig.payment.mintpay.mode,
        orderId: input.orderId,
      },
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
    const orderId = String(payload.orderId ?? payload.order_id ?? payload.purchase_id ?? '');

    logger.info({ gateway: 'mintpay', orderId, status, mappedStatus }, 'Mintpay: webhook verified');

    const amountRaw = payload.amount ?? payload.total_price;
    const amount = amountRaw === undefined || amountRaw === '' ? undefined : Number(amountRaw);

    return {
      valid: true,
      gatewayTxnId: String(payload.transactionId ?? payload.ref ?? payload.purchase_id ?? ''),
      orderId,
      status: mappedStatus,
      amount,
      currency: String(payload.currency ?? payload.currency_code ?? ''),
      payload,
    };
  }
}

export const mintpayGateway = new MintpayGateway();
