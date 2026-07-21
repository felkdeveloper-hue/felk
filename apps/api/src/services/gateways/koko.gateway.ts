import { createSign, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service';
import { getHeader, parseWebhookPayload, rawBodyToString } from '@/services/gateways/gateway.utils';
import { ApiError } from '@/utils/errors/api-error';

const KOKO_STATUS_MAP: Record<string, string> = {
  approved: PAYMENT_STATUS.PAID,
  completed: PAYMENT_STATUS.PAID,
  success: PAYMENT_STATUS.PAID,
  pending: PAYMENT_STATUS.PROCESSING,
  declined: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
  expired: PAYMENT_STATUS.EXPIRED,
};

const PLUGIN_NAME = 'fe-platform';
const PLUGIN_VERSION = '1.0.0';

/** Real Paykoko hosts (from official WooCommerce plugin). */
function kokoOrderCreateUrl(): string {
  return appConfig.payment.koko.mode === 'live'
    ? 'https://prodapi.paykoko.com/api/merchants/orderCreate'
    : 'https://qaapi.paykoko.com/api/merchants/orderCreate';
}

function loadPrivateKey(): string | null {
  const keyPath = appConfig.payment.koko.privateKeyPath;
  if (!keyPath) return null;
  try {
    const absPath = resolve(process.cwd(), keyPath);
    return readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

function buildRequestSignature(payload: string, privateKey: string): string {
  const sign = createSign('RSA-SHA256');
  sign.update(payload);
  return sign.sign(privateKey, 'base64');
}

export class KokoGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.KOKO;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `koko_${input.orderId}_${randomBytes(4).toString('hex')}`;
    const { apiKey, merchantId, privateKeyPath } = appConfig.payment.koko;

    if (!apiKey || !merchantId || merchantId === 'dev-koko-merchant-id' || !privateKeyPath) {
      throw ApiError.badRequest(
        'Koko is not configured. Set KOKO_MERCHANT_ID, KOKO_API_KEY, and KOKO_PRIVATE_KEY_PATH.',
        undefined,
        'KOKO_NOT_CONFIGURED',
      );
    }

    const privateKey = loadPrivateKey();
    if (!privateKey) {
      throw ApiError.badRequest(
        `Koko private key not found at ${privateKeyPath}. Place the PEM file there or update KOKO_PRIVATE_KEY_PATH.`,
        { privateKeyPath },
        'KOKO_PRIVATE_KEY_MISSING',
      );
    }

    const amount = input.amount.toFixed(2);
    const currency = input.currency;
    const email = input.customerEmail;
    const firstName = String(input.metadata?.firstName ?? 'Customer');
    const lastName = String(input.metadata?.lastName ?? '');
    const mobile = String(input.metadata?.customerPhone ?? '');
    const description =
      typeof input.metadata?.description === 'string'
        ? input.metadata.description
        : `Order ${input.orderId}`;
    const reference = `${merchantId.slice(0, 8)}${randomBytes(3).toString('hex')}-${input.orderId}`;
    const returnUrl = input.returnUrl;
    const cancelUrl = input.cancelUrl;
    const responseUrl = String(input.metadata?.responseUrl ?? input.returnUrl);

    // Signing order must match Paykoko / official WooCommerce plugin exactly.
    const dataString =
      merchantId +
      amount +
      currency +
      PLUGIN_NAME +
      PLUGIN_VERSION +
      returnUrl +
      cancelUrl +
      input.orderId +
      reference +
      firstName +
      lastName +
      email +
      description +
      apiKey +
      responseUrl;

    const signature = buildRequestSignature(dataString, privateKey);
    const action = kokoOrderCreateUrl();

    logger.info(
      {
        gateway: 'koko',
        orderId: input.orderId,
        mode: appConfig.payment.koko.mode,
        action,
      },
      'Koko: checkout form prepared',
    );

    return {
      gatewayPaymentId,
      redirectUrl: action,
      redirectForm: {
        action,
        method: 'POST',
        fields: {
          _mId: merchantId,
          api_key: apiKey,
          _returnUrl: returnUrl,
          _responseUrl: responseUrl,
          _cancelUrl: cancelUrl,
          _currency: currency,
          _amount: amount,
          _reference: reference,
          _pluginName: PLUGIN_NAME,
          _pluginVersion: PLUGIN_VERSION,
          _orderId: input.orderId,
          _firstName: firstName,
          _lastName: lastName,
          _email: email,
          _description: description,
          _mobileNo: mobile,
          dataString,
          signature,
        },
      },
      raw: { reference, merchantId, mode: appConfig.payment.koko.mode },
    };
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const signature = getHeader(input.headers, 'x-koko-signature');
    if (!signature) {
      logger.warn({ gateway: 'koko' }, 'Koko: webhook missing x-koko-signature header');
      return { valid: false };
    }

    const expected = hmacSha256Hex(
      appConfig.payment.koko.secretKey,
      rawBodyToString(input.rawBody),
    );
    if (!safeCompare(expected, signature)) {
      logger.warn({ gateway: 'koko' }, 'Koko: webhook HMAC signature mismatch');
      return { valid: false };
    }

    const payload = parseWebhookPayload(input.rawBody);
    const status = String(payload.status ?? '').toLowerCase();
    const mappedStatus = KOKO_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED;

    logger.info(
      { gateway: 'koko', orderId: payload.orderId, status, mappedStatus },
      'Koko: webhook verified',
    );

    return {
      valid: true,
      gatewayTxnId: String(payload.transactionId ?? payload.ref ?? payload.trnId ?? ''),
      orderId: String(payload.orderId ?? ''),
      status: mappedStatus,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const kokoGateway = new KokoGateway();
