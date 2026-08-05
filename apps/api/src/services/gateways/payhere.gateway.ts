import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status.js';
import { md5Hex } from '@/utils/crypto.helper.js';
import { fetchWithRetry, HttpRetryError } from '@/utils/http-retry.js';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service.js';
import {
  getHeader,
  parseWebhookPayload,
  toPublicStorefrontUrl,
} from '@/services/gateways/gateway.utils.js';
import { ApiError } from '@/utils/errors/api-error.js';

/** PayHere notify status_code -> our verification status mapping. */
const STATUS_CODE_MAP: Record<string, string> = {
  '2': PAYMENT_STATUS.PAID,
  '0': PAYMENT_STATUS.PROCESSING,
  '-1': PAYMENT_STATUS.CANCELLED,
  '-2': PAYMENT_STATUS.FAILED,
  '-3': PAYMENT_STATUS.REFUNDED,
};

/** Retrieval API payment.status -> our status. */
const RETRIEVAL_STATUS_MAP: Record<string, string> = {
  RECEIVED: PAYMENT_STATUS.PAID,
  REFUNDED: PAYMENT_STATUS.REFUNDED,
  'REFUND REQUESTED': PAYMENT_STATUS.REFUND_PENDING,
  CHARGEBACKED: PAYMENT_STATUS.FAILED,
  HOLD: PAYMENT_STATUS.PROCESSING,
};

type OAuthTokenCache = { token: string; expiresAt: number };

let oauthCache: OAuthTokenCache | null = null;

function merchantId(): string {
  return String(appConfig.payment.payhere.merchantId ?? '').trim();
}

function merchantSecret(): string {
  return String(appConfig.payment.payhere.merchantSecret ?? '').trim();
}

function hashSecret(): string {
  return md5Hex(merchantSecret());
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
  return md5Hex(`${merchantId()}${orderId}${amount}${currency}${hashSecret()}`);
}

/** PayHere webhook signature: MD5(merchant_id + order_id + amount + currency + status_code + MD5(secret)). */
function buildNotifyHash(
  orderId: string,
  amount: string,
  currency: string,
  statusCode: string,
): string {
  return md5Hex(`${merchantId()}${orderId}${amount}${currency}${statusCode}${hashSecret()}`);
}

function publicNotifyUrl(): string {
  const configured = String(appConfig.payment.payhere.notifyUrl ?? '').trim();
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
  return 'https://api.fe.lk/api/v1/payments/webhooks/payhere';
}

function metaString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function splitCustomerName(email: string, metadata?: Record<string, unknown>) {
  const first = metaString(metadata, 'firstName') || metaString(metadata, 'first_name');
  const last = metaString(metadata, 'lastName') || metaString(metadata, 'last_name');
  if (first || last) {
    return { firstName: first || 'Customer', lastName: last || 'Customer' };
  }
  const local = email.split('@')[0] ?? 'Customer';
  const parts = local.split(/[._-]+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Customer',
    lastName: parts.slice(1).join(' ') || 'Customer',
  };
}

/**
 * OAuth client-credentials token for Merchant APIs (Retrieval / Refund / Capture).
 * Tokens expire ~10 minutes; cache with a 30s safety margin.
 */
async function getAccessToken(): Promise<string> {
  const { appId, appSecret } = appConfig.payment.payhere;
  if (!appId || !appSecret) {
    throw ApiError.badRequest(
      'PayHere App ID/Secret not configured. Set PAYHERE_APP_ID and PAYHERE_APP_SECRET.',
      undefined,
      'PAYHERE_OAUTH_NOT_CONFIGURED',
    );
  }

  if (oauthCache && oauthCache.expiresAt > Date.now() + 30_000) {
    return oauthCache.token;
  }

  const auth = Buffer.from(`${appId}:${appSecret}`).toString('base64');
  const url = `${baseUrl()}/merchant/v1/oauth/token`;

  try {
    const { data } = await fetchWithRetry<{
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    }>(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
      { maxAttempts: 2 },
    );

    const token = data.access_token;
    if (!token) {
      throw ApiError.badRequest(
        data.error_description ?? data.error ?? 'PayHere OAuth token missing in response',
        undefined,
        'PAYHERE_OAUTH_FAILED',
      );
    }

    const expiresInSec = Number(data.expires_in ?? 599);
    oauthCache = {
      token,
      expiresAt: Date.now() + Math.max(60, expiresInSec) * 1000,
    };

    logger.info({ gateway: 'payhere', expiresInSec }, 'PayHere: OAuth token acquired');
    return token;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const status = err instanceof HttpRetryError ? err.lastStatus : undefined;
    logger.warn({ gateway: 'payhere', status, err }, 'PayHere: OAuth token request failed');
    throw ApiError.badRequest(
      'Failed to obtain PayHere OAuth access token. Check PAYHERE_APP_ID / PAYHERE_APP_SECRET.',
      { status },
      'PAYHERE_OAUTH_FAILED',
    );
  }
}

/** Clear cached token (used after 401 so the next call refreshes). */
function invalidateAccessToken() {
  oauthCache = null;
}

export class PayHereGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.PAYHERE;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    if (!merchantId() || !merchantSecret()) {
      throw ApiError.badRequest(
        'PayHere is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET.',
        undefined,
        'PAYHERE_NOT_CONFIGURED',
      );
    }

    const amount = Number(input.amount).toFixed(2);
    const currency = String(input.currency || 'LKR').toUpperCase();
    // PayHere order_id must be stable alphanumeric — strip anything odd.
    const orderId =
      String(input.orderId)
        .replace(/[^A-Za-z0-9_-]/g, '')
        .slice(0, 64) || input.orderId;
    const hash = buildRequestHash(orderId, amount, currency);
    const { firstName, lastName } = splitCustomerName(input.customerEmail, input.metadata);
    const notifyUrl = publicNotifyUrl();
    const returnUrl = toPublicStorefrontUrl(input.returnUrl);
    const cancelUrl = toPublicStorefrontUrl(input.cancelUrl);

    const countryRaw =
      metaString(input.metadata, 'country') ||
      metaString(input.metadata, 'deliveryCountry') ||
      'Sri Lanka';
    const country =
      countryRaw.toUpperCase() === 'LK' || countryRaw.toUpperCase() === 'LKA'
        ? 'Sri Lanka'
        : countryRaw;

    const fields: Record<string, string> = {
      merchant_id: merchantId(),
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      order_id: orderId,
      items: (metaString(input.metadata, 'description') || `Order ${orderId}`).slice(0, 255),
      currency,
      amount,
      first_name: firstName.slice(0, 50),
      last_name: lastName.slice(0, 50),
      email: input.customerEmail,
      phone: (
        metaString(input.metadata, 'phone') ||
        metaString(input.metadata, 'customerPhone') ||
        '0770000000'
      ).slice(0, 20),
      address: (
        metaString(input.metadata, 'address') ||
        metaString(input.metadata, 'deliveryStreet') ||
        metaString(input.metadata, 'deliveryAddress') ||
        'N/A'
      ).slice(0, 100),
      city: (
        metaString(input.metadata, 'city') ||
        metaString(input.metadata, 'deliveryRegion') ||
        metaString(input.metadata, 'deliveryCity') ||
        'Colombo'
      ).slice(0, 50),
      country: country.slice(0, 50),
      hash,
    };

    const deliveryAddress =
      metaString(input.metadata, 'deliveryAddress') || metaString(input.metadata, 'deliveryStreet');
    if (deliveryAddress) fields.delivery_address = deliveryAddress.slice(0, 100);
    const deliveryCity =
      metaString(input.metadata, 'deliveryCity') || metaString(input.metadata, 'deliveryRegion');
    if (deliveryCity) fields.delivery_city = deliveryCity.slice(0, 50);
    const deliveryCountry = metaString(input.metadata, 'deliveryCountry') || country;
    if (deliveryCountry) fields.delivery_country = deliveryCountry.slice(0, 50);

    logger.info(
      {
        gateway: 'payhere',
        orderId,
        amount,
        currency,
        mode: appConfig.payment.payhere.mode,
        notifyUrl,
        returnUrl,
        cancelUrl,
      },
      'PayHere: session created',
    );

    return {
      gatewayPaymentId: orderId,
      // Prefer POST form (official Checkout API). Frontend auto-submits redirectForm.
      redirectForm: {
        action: checkoutUrl(),
        method: 'POST',
        fields,
      },
      raw: {
        merchantId: merchantId(),
        hash,
        mode: appConfig.payment.payhere.mode,
        notifyUrl,
        returnUrl,
        cancelUrl,
      },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const payload = parseWebhookPayload(input.rawBody);
    const receivedMerchantId = String(payload.merchant_id ?? '');
    const orderId = String(payload.order_id ?? '');
    const payhereAmount = String(payload.payhere_amount ?? '');
    const payhereCurrency = String(payload.payhere_currency ?? '');
    const statusCode = String(payload.status_code ?? '');
    const receivedSig = String(payload.md5sig ?? getHeader(input.headers, 'md5sig') ?? '');

    logger.info(
      { gateway: 'payhere', orderId, statusCode, merchantId: receivedMerchantId },
      'PayHere: webhook received',
    );

    if (!receivedMerchantId || !orderId || !statusCode || !receivedSig) {
      logger.warn({ gateway: 'payhere', orderId }, 'PayHere: webhook missing required fields');
      return { valid: false, payload };
    }

    if (receivedMerchantId !== merchantId()) {
      logger.warn(
        {
          gateway: 'payhere',
          received: receivedMerchantId,
          expected: merchantId(),
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
   * Defense-in-depth: fetch payment status via Retrieval API (OAuth Bearer).
   * Never authoritative over a verified webhook.
   */
  async verifyTransaction(
    orderId: string,
  ): Promise<{ status: string; amount?: number; currency?: string } | null> {
    const url = `${baseUrl()}/merchant/v1/payment/search?order_id=${encodeURIComponent(orderId)}`;

    try {
      const data = await this.authorizedJsonGet<Record<string, unknown>>(url);
      const list = Array.isArray(data.data) ? (data.data as Record<string, unknown>[]) : [];
      const payment = list[0];
      if (!payment) {
        logger.info({ gateway: 'payhere', orderId }, 'PayHere: retrieval found no payments');
        return null;
      }

      const statusRaw = String(payment.status ?? '').toUpperCase();
      const status = RETRIEVAL_STATUS_MAP[statusRaw] ?? PAYMENT_STATUS.FAILED;
      const amountDetail = payment.amount_detail as Record<string, unknown> | undefined;

      logger.info(
        { gateway: 'payhere', orderId, statusRaw, status },
        'PayHere: transaction verification response',
      );

      return {
        status,
        amount: Number(amountDetail?.gross ?? payment.amount ?? 0),
        currency: String((amountDetail?.currency as string | undefined) ?? payment.currency ?? ''),
      };
    } catch (err) {
      logger.warn({ gateway: 'payhere', orderId, err }, 'PayHere: transaction verification failed');
      return null;
    }
  }

  /**
   * Refund a PayHere payment by PayHere `payment_id` (not merchant order_id).
   */
  async refund(input: {
    gatewayPaymentId: string;
    amount: number;
    reason?: string;
  }): Promise<{ gatewayTxnId: string; status: string }> {
    const url = `${baseUrl()}/merchant/v1/payment/refund`;
    const body = {
      payment_id: input.gatewayPaymentId,
      description: input.reason ?? 'Refund requested',
    };

    try {
      const data = await this.authorizedJsonPost<Record<string, unknown>>(url, body);
      const ok = Number(data.status) === 1 || String(data.status).toLowerCase() === 'success';
      if (!ok) {
        throw ApiError.badRequest(
          String(data.msg ?? data.message ?? 'PayHere refund rejected'),
          data,
          'PAYHERE_REFUND_FAILED',
        );
      }

      logger.info(
        { gateway: 'payhere', paymentId: input.gatewayPaymentId },
        'PayHere: refund accepted',
      );

      return {
        gatewayTxnId: String(data.payment_id ?? input.gatewayPaymentId),
        status: PAYMENT_STATUS.REFUNDED,
      };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.warn(
        { gateway: 'payhere', paymentId: input.gatewayPaymentId, err },
        'PayHere: refund request failed',
      );
      throw ApiError.badRequest(
        'PayHere refund request failed',
        undefined,
        'PAYHERE_REFUND_FAILED',
      );
    }
  }

  private async authorizedJsonGet<T>(url: string): Promise<T> {
    return this.authorizedFetch<T>(url, { method: 'GET' });
  }

  private async authorizedJsonPost<T>(url: string, body: unknown): Promise<T> {
    return this.authorizedFetch<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async authorizedFetch<T>(url: string, init: RequestInit): Promise<T> {
    const run = async (token: string) => {
      const headers = {
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
      const { data } = await fetchWithRetry<T>(url, { ...init, headers }, { maxAttempts: 2 });
      return data;
    };

    try {
      return await run(await getAccessToken());
    } catch (err) {
      if (err instanceof HttpRetryError && err.lastStatus === 401) {
        invalidateAccessToken();
        return run(await getAccessToken());
      }
      throw err;
    }
  }
}

export const payHereGateway = new PayHereGateway();
