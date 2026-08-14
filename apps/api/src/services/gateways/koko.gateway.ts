import {
  createSign,
  createVerify,
  publicDecrypt,
  randomBytes,
  constants as cryptoConstants,
} from 'node:crypto';
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
import {
  normalizeMintpayTelephone,
  parseWebhookPayload,
  toPublicStorefrontUrl,
} from '@/services/gateways/gateway.utils.js';
import { ApiError } from '@/utils/errors/api-error.js';
import { fetchWithRetry, HttpRetryError } from '@/utils/http-retry.js';

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

const PLUGIN_NAME = appConfig.payment.koko.pluginName || 'customapi';
const PLUGIN_VERSION = appConfig.payment.koko.pluginVersion || '1';
const ORDER_VIEW_PLUGIN_VERSIONS = [...new Set([PLUGIN_VERSION, '1', '1.0.1'])];

const PEM_BEGIN = /-----BEGIN [A-Z0-9 ]+-----/;
const PEM_PRIVATE = /-----BEGIN (?:RSA )?PRIVATE KEY-----/;
const PEM_PUBLIC = /-----BEGIN (?:RSA )?PUBLIC KEY-----/;

/** Only prodapi when KOKO_MODE=live. QA merchant IDs are not registered on production. */
function useLiveKoko(): boolean {
  return appConfig.payment.koko.mode === 'live';
}

function kokoOrderCreateUrl(): string {
  return useLiveKoko()
    ? 'https://prodapi.paykoko.com/api/merchants/orderCreate'
    : 'https://qaapi.paykoko.com/api/merchants/orderCreate';
}

function kokoOrderViewUrl(): string {
  return useLiveKoko()
    ? 'https://prodapi.paykoko.com/api/merchants/orderView'
    : 'https://qaapi.paykoko.com/api/merchants/orderView';
}

function kokoApiPublicUrl(): string {
  const configured = (process.env.API_PUBLIC_URL ?? '').replace(/\/$/, '');
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) return configured;
  if (useLiveKoko()) return 'https://api.fe.lk';
  return 'http://localhost:4000';
}

/** dotenv / systemd / quoted .env can leave literal \n, extra quotes, or spaces. */
function normalizePem(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  value = value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
  value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return value.trim();
}

function looksLikePem(value: string, kind: 'private' | 'public' | 'any' = 'any'): boolean {
  const normalized = normalizePem(value);
  if (!PEM_BEGIN.test(normalized)) return false;
  if (kind === 'private') return PEM_PRIVATE.test(normalized);
  if (kind === 'public') return PEM_PUBLIC.test(normalized);
  return true;
}

function readKeyFile(filePath: string): string | null {
  const candidates = [resolve(process.cwd(), filePath), filePath];
  for (const candidate of candidates) {
    try {
      const contents = readFileSync(candidate, 'utf8');
      if (contents.trim()) return normalizePem(contents);
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Accepts inline PEM (KOKO_PRIVATE_KEY / accidentally pasted into PATH) or a file path.
 * Never throws the key material.
 */
function resolveKeyMaterial(
  inline: string | undefined,
  pathOrPem: string | undefined,
  kind: 'private' | 'public',
): string | null {
  if (inline && looksLikePem(inline, kind === 'private' ? 'private' : 'any')) {
    return normalizePem(inline);
  }
  if (inline && !looksLikePem(inline) && inline.length < 512) {
    const fromInlinePath = readKeyFile(inline);
    if (fromInlinePath && looksLikePem(fromInlinePath, kind === 'private' ? 'private' : 'any')) {
      return fromInlinePath;
    }
  }

  if (!pathOrPem) return null;

  if (looksLikePem(pathOrPem, kind === 'private' ? 'private' : 'any')) {
    return normalizePem(pathOrPem);
  }

  return readKeyFile(pathOrPem);
}

function loadPrivateKey(): string | null {
  return resolveKeyMaterial(
    appConfig.payment.koko.privateKey,
    appConfig.payment.koko.privateKeyPath,
    'private',
  );
}

function loadPublicKey(): string | null {
  return resolveKeyMaterial(appConfig.payment.koko.publicKey, undefined, 'public');
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

/** Some Koko callbacks use private-encrypt rather than SHA-256 sign. */
function verifyKokoEncryptedPayload(data: string, signature: string, publicKey: string): boolean {
  try {
    const decrypted = publicDecrypt(
      { key: publicKey, padding: cryptoConstants.RSA_PKCS1_PADDING },
      Buffer.from(signature, 'base64'),
    );
    return decrypted.toString('utf8') === data;
  } catch {
    return false;
  }
}

function optionalAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function kokoCallbackField(payload: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function isKokoSuccessStatus(status: string): boolean {
  const mapped = KOKO_STATUS_MAP[status] ?? KOKO_STATUS_MAP[status.toUpperCase()];
  return mapped === PAYMENT_STATUS.PAID;
}

function kokoOrderIdCandidates(orderId: string, referenceNumber?: string): string[] {
  const ids = new Set<string>();
  const add = (value?: string) => {
    const trimmed = value?.trim();
    if (trimmed) ids.add(trimmed);
  };
  add(orderId);
  add(referenceNumber);
  const bases = [orderId, referenceNumber].filter(Boolean).map((value) =>
    String(value)
      .replace(/-A\d+$/i, '')
      .replace(/-AI$/i, ''),
  );
  for (const base of bases) {
    add(base);
    add(`${base}-A1`);
    add(`${base}-AI`);
  }
  return [...ids];
}

function flattenKokoView(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : record.result && typeof record.result === 'object' && !Array.isArray(record.result)
        ? (record.result as Record<string, unknown>)
        : record;
  return { ...record, ...nested };
}

const KOKO_UNAVAILABLE =
  'Koko payment is temporarily unavailable. Please choose PayHere or Mintpay.';

export class KokoGateway implements PaymentGateway {
  readonly name = PAYMENT_METHOD.KOKO;

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const gatewayPaymentId = `koko_${input.orderId}_${randomBytes(4).toString('hex')}`;
    const { apiKey, merchantId } = appConfig.payment.koko;

    if (!apiKey || !merchantId || merchantId === 'dev-koko-merchant-id') {
      logger.error({ gateway: 'koko' }, 'Koko: merchant/API key not configured');
      throw ApiError.badRequest(KOKO_UNAVAILABLE, undefined, 'KOKO_NOT_CONFIGURED');
    }

    const privateKey = loadPrivateKey();
    if (!privateKey) {
      logger.error(
        { gateway: 'koko' },
        'Koko: private key missing. Set KOKO_PRIVATE_KEY (PEM) or KOKO_PRIVATE_KEY_PATH to a .pem file.',
      );
      throw ApiError.badRequest(KOKO_UNAVAILABLE, undefined, 'KOKO_PRIVATE_KEY_MISSING');
    }

    const amount = input.amount.toFixed(2);
    const currency = input.currency;
    const email = input.customerEmail;
    const firstName = String(input.metadata?.firstName ?? 'Customer');
    const lastName = String(input.metadata?.lastName ?? '');
    const rawMobile = String(input.metadata?.customerPhone ?? input.metadata?.phone ?? '');
    const mobile = rawMobile.replace(/\D/g, '') ? normalizeMintpayTelephone(rawMobile) : '';
    const description =
      typeof input.metadata?.description === 'string'
        ? input.metadata.description
        : `Order ${input.orderId}`;
    const reference = `${merchantId.slice(0, 8)}${randomBytes(3).toString('hex')}-${input.orderId}`;
    const returnUrl = toPublicStorefrontUrl(input.returnUrl);
    const cancelUrl = toPublicStorefrontUrl(input.cancelUrl);
    const apiPublicUrl = kokoApiPublicUrl();
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

    let signature: string;
    try {
      signature = buildRequestSignature(dataString, privateKey);
    } catch (err) {
      logger.error(
        { gateway: 'koko', err: err instanceof Error ? err.message : 'sign_failed' },
        'Koko: RSA private key is invalid and cannot sign the request',
      );
      throw ApiError.badRequest(KOKO_UNAVAILABLE, undefined, 'KOKO_PRIVATE_KEY_INVALID');
    }

    const action = kokoOrderCreateUrl();

    logger.info(
      {
        gateway: 'koko',
        orderId: input.orderId,
        mode: useLiveKoko() ? 'live' : 'sandbox',
        action,
        hasMobile: Boolean(mobile),
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
      raw: { reference, merchantId, mode: useLiveKoko() ? 'live' : 'sandbox' },
    };
  }

  async queryOrderView(
    orderId: string,
    pluginVersion = PLUGIN_VERSION,
  ): Promise<{
    orderId: string;
    trnId: string;
    status: string;
  } | null> {
    if (!orderId) return null;
    const { apiKey, merchantId } = appConfig.payment.koko;
    const privateKey = loadPrivateKey();
    if (!apiKey || !merchantId || !privateKey) return null;

    const dataString = merchantId + PLUGIN_NAME + pluginVersion + orderId + apiKey;
    let signature: string;
    try {
      signature = buildRequestSignature(dataString, privateKey);
    } catch (err) {
      logger.warn(
        { gateway: 'koko', err: err instanceof Error ? err.message : 'sign_failed' },
        'Koko: orderView signing failed',
      );
      return null;
    }

    const body = new URLSearchParams({
      _mId: merchantId,
      api_key: apiKey,
      _orderId: orderId,
      _pluginName: PLUGIN_NAME,
      _pluginVersion: pluginVersion,
      signature,
    });

    try {
      const { data } = await fetchWithRetry<unknown>(kokoOrderViewUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const payload = typeof data === 'string' ? parseWebhookPayload(data) : flattenKokoView(data);
      const viewedOrderId = kokoCallbackField(payload, 'orderId', '_orderId');
      const trnId = kokoCallbackField(payload, 'trnId', 'trn_id', 'transactionId');
      const status = kokoCallbackField(payload, 'status', 'paymentStatus');
      if (!status) {
        logger.warn(
          { gateway: 'koko', orderId, pluginVersion },
          'Koko: orderView returned no status',
        );
        return null;
      }
      return { orderId: viewedOrderId || orderId, trnId, status };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'orderView_failed';
      const notExists = message.includes('OnlineOrderView.order.notExists');
      if (!notExists) {
        logger.warn(
          { gateway: 'koko', orderId, pluginVersion, err: message },
          'Koko: orderView request failed',
        );
      }
      if (err instanceof HttpRetryError && notExists) return null;
      if (notExists) return null;
      return null;
    }
  }

  async verifyTransaction(orderId: string) {
    const ids = kokoOrderIdCandidates(orderId);
    for (const candidate of ids) {
      for (const pluginVersion of ORDER_VIEW_PLUGIN_VERSIONS) {
        const viewed = await this.queryOrderView(candidate, pluginVersion);
        if (!viewed) continue;
        const mappedStatus =
          KOKO_STATUS_MAP[viewed.status] ?? KOKO_STATUS_MAP[viewed.status.toUpperCase()];
        if (!mappedStatus) continue;
        return {
          status: mappedStatus,
          gatewayTxnId: viewed.trnId || undefined,
        };
      }
    }
    return null;
  }

  async verifyWebhook(input: WebhookVerificationInput) {
    const payload = parseWebhookPayload(input.rawBody);
    const orderId = kokoCallbackField(payload, 'orderId', '_orderId');
    const trnId = kokoCallbackField(payload, 'trnId', 'trn_id', 'transactionId');
    const status = kokoCallbackField(payload, 'status', 'paymentStatus');
    const signature = kokoCallbackField(payload, 'signature');

    if (!orderId || !status) {
      logger.warn({ gateway: 'koko' }, 'Koko: webhook missing orderId or status');
      return { valid: false };
    }

    const publicKey = loadPublicKey();
    if (publicKey && signature) {
      const dataToVerify = orderId + trnId + status;
      const isValid =
        verifyKokoSignature(dataToVerify, signature, publicKey) ||
        verifyKokoEncryptedPayload(dataToVerify, signature, publicKey);
      if (!isValid) {
        logger.warn(
          { gateway: 'koko', orderId },
          'Koko: RSA signature verification failed — confirming with orderView',
        );
        const viewed = await this.queryOrderView(orderId);
        if (!viewed || !isKokoSuccessStatus(viewed.status)) {
          return { valid: false };
        }
        const mappedFromView =
          KOKO_STATUS_MAP[viewed.status] ??
          KOKO_STATUS_MAP[viewed.status.toUpperCase()] ??
          PAYMENT_STATUS.PAID;
        return {
          valid: true,
          gatewayTxnId: viewed.trnId || trnId,
          orderId,
          status: mappedFromView,
          amount: optionalAmount(payload.amount),
          currency: String(payload.currency ?? ''),
          payload,
        };
      }
    } else if (!publicKey) {
      logger.warn(
        { gateway: 'koko' },
        'Koko: no public key configured (KOKO_PUBLIC_KEY), skipping signature verification',
      );
    }

    const mappedStatus =
      KOKO_STATUS_MAP[status] ?? KOKO_STATUS_MAP[status.toUpperCase()] ?? PAYMENT_STATUS.FAILED;

    logger.info(
      { gateway: 'koko', orderId, trnId, status, mappedStatus },
      'Koko: webhook processed',
    );

    return {
      valid: true,
      gatewayTxnId: trnId,
      orderId,
      status: mappedStatus,
      amount: optionalAmount(payload.amount),
      currency: String(payload.currency ?? ''),
      payload,
    };
  }
}

export const kokoGateway = new KokoGateway();

/** Config presence only — never returns key material. */
export function kokoPrivateKeyReady(): boolean {
  return Boolean(loadPrivateKey());
}
