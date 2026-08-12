import { createSign, createVerify, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '@/constants/payment-status.js';
import type {
  CreatePaymentSessionInput,
  PaymentGateway,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service.js';
import { parseWebhookPayload } from '@/services/gateways/gateway.utils.js';
import { ApiError } from '@/utils/errors/api-error.js';

const KOKO_STATUS_MAP: Record<string, string> = {
  approved: PAYMENT_STATUS.PAID,
  completed: PAYMENT_STATUS.PAID,
  success: PAYMENT_STATUS.PAID,
  SUCCESS: PAYMENT_STATUS.PAID,
  pending: PAYMENT_STATUS.PROCESSING,
  PENDING: PAYMENT_STATUS.PROCESSING,
  declined: PAYMENT_STATUS.FAILED,
  failed: PAYMENT_STATUS.FAILED,
  FAILED: PAYMENT_STATUS.FAILED,
  cancelled: PAYMENT_STATUS.CANCELLED,
  CANCELED: PAYMENT_STATUS.CANCELLED,
  expired: PAYMENT_STATUS.EXPIRED,
};

const PLUGIN_NAME = 'customapi';
const PLUGIN_VERSION = '1';

function kokoOrderCreateUrl(): string {
  return appConfig.payment.koko.mode === 'live'
    ? 'https://prodapi.paykoko.com/api/merchants/orderCreate'
    : 'https://qaapi.paykoko.com/api/merchants/orderCreate';
}

/**
 * Load private key — supports both inline PEM content and a file path.
 */
function loadPrivateKey(): string | null {
  const keyOrPath = appConfig.payment.koko.privateKeyPath;
  if (!keyOrPath) return null;

  if (keyOrPath.includes('-----BEGIN')) {
    return keyOrPath.replace(/\\n/g, '\n').trim();
  }

  try {
    const absPath = resolve(process.cwd(), keyOrPath);
    return readFileSync(absPath, 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Load Koko public key for verifying response/webhook signatures.
 */
function loadPublicKey(): string | null {
  const keyOrPath = appConfig.payment.koko.publicKey;
  if (!keyOrPath) return null;

  if (keyOrPath.includes('-----BEGIN')) {
    return keyOrPath.replace(/\\n/g, '\n').trim();
  }

  try {
    const absPath = resolve(process.cwd(), keyOrPath);
    return readFileSync(absPath, 'utf8').trim();
  } catch {
    return null;
  }
}

function buildRequestSignature(payload: string, privateKey: string): string {
  const sign = createSign('SHA256');
  sign.update(payload);
  return sign.sign(privateKey, 'base64');
}

function verifyKokoSignature(data: string, signature: string, publicKey: string): boolean {
  try {
    const verifier = createVerify('SHA256');
    verifier.update(data);
    return verifier.verify(publicKey, signature, 'base64');
  } catch (err) {
    logger.warn({ err }, 'Koko: RSA signature verification error');
    return false;
  }
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
    const apiPublicUrl = (process.env.API_PUBLIC_URL ?? 'http://localhost:4000').replace(/\/$/, '');
    const apiPrefix = process.env.API_PREFIX ?? '/api/v1';
    const responseUrl = String(
      input.metadata?.responseUrl ?? `${apiPublicUrl}${apiPrefix}/payments/webhooks/koko`,
    );

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
    const payload = parseWebhookPayload(input.rawBody);
    const orderId = String(payload.orderId ?? '');
    const trnId = String(payload.trnId ?? '');
    const status = String(payload.status ?? '');
    const signature = String(payload.signature ?? '');

    if (!orderId || !status) {
      logger.warn({ gateway: 'koko' }, 'Koko: webhook missing orderId or status');
      return { valid: false };
    }

    const publicKey = loadPublicKey();
    if (publicKey && signature) {
      const dataToVerify = orderId + trnId + status;
      const isValid = verifyKokoSignature(dataToVerify, signature, publicKey);
      if (!isValid) {
        logger.warn({ gateway: 'koko', orderId }, 'Koko: RSA signature verification failed');
        return { valid: false };
      }
    } else if (!publicKey) {
      logger.warn(
        { gateway: 'koko' },
        'Koko: no public key configured (KOKO_PUBLIC_KEY), skipping signature verification',
      );
    }

    const mappedStatus = KOKO_STATUS_MAP[status] ?? PAYMENT_STATUS.FAILED;

    logger.info(
      { gateway: 'koko', orderId, trnId, status, mappedStatus },
      'Koko: webhook processed',
    );

    return {
      valid: true,
      gatewayTxnId: trnId,
      orderId,
      status: mappedStatus,
      amount: Number(payload.amount ?? 0),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const kokoGateway = new KokoGateway();
