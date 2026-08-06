import { appConfig } from '@/config/app.config.js';
import type { WebhookVerificationInput } from '@/services/interfaces/payment-gateway.service.js';

/** Case-insensitive header lookup — Express lower-cases incoming header names, but be defensive. */
export function getHeader(
  headers: WebhookVerificationInput['headers'],
  name: string,
): string | undefined {
  const key = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
  if (!key) return undefined;
  const value = headers[key];
  return Array.isArray(value) ? value[0] : value;
}

export function rawBodyToString(rawBody: Buffer | string): string {
  return Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
}

/**
 * Best-effort parse of a webhook body as either form-urlencoded or JSON.
 * Gateway webhooks commonly use one or the other depending on merchant config.
 */
export function parseWebhookPayload(rawBody: Buffer | string): Record<string, unknown> {
  const text = rawBodyToString(rawBody).trim();
  if (!text) return {};

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      // fall through to form parsing
    }
  }

  const params = new URLSearchParams(text);
  const result: Record<string, unknown> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * Mintpay / PayHere reject localhost callback URLs (WAF / domain allowlist).
 * Rewrite local or http origins to the public storefront (SHOP_URL / fe.lk).
 */
export function toPublicStorefrontUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0' ||
      parsed.hostname.endsWith('.local');
    const isDeadLegacyHost =
      parsed.hostname === 'fashionedge.lk' || parsed.hostname === 'www.fashionedge.lk';

    if (!isLocal && !isDeadLegacyHost && parsed.protocol === 'https:') return rawUrl;

    const origin =
      process.env.MINTPAY_PUBLIC_ORIGIN?.trim() ||
      process.env.STOREFRONT_PUBLIC_URL?.trim() ||
      appConfig.email?.shopUrl?.trim() ||
      appConfig.cors.origins.find((o) => o.includes('fe.lk') && o.startsWith('https://')) ||
      appConfig.cors.origins.find((o) => o.startsWith('https://')) ||
      'https://fe.lk';

    const publicOrigin = new URL(origin.endsWith('/') ? origin.slice(0, -1) : origin);
    // Never rewrite onto a non-HTTPS or dead host.
    if (
      publicOrigin.hostname === 'fashionedge.lk' ||
      publicOrigin.hostname === 'www.fashionedge.lk' ||
      publicOrigin.hostname === 'localhost' ||
      publicOrigin.hostname === '127.0.0.1'
    ) {
      publicOrigin.hostname = 'fe.lk';
      publicOrigin.protocol = 'https:';
      publicOrigin.port = '';
    }
    parsed.protocol = 'https:';
    parsed.hostname = publicOrigin.hostname === 'fe.lk' ? 'fe.lk' : publicOrigin.hostname;
    parsed.port = publicOrigin.port;
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

const MINTPAY_EMAIL_MAX_LEN = 40;
const MINTPAY_SIGNED_INT_MAX = 2_147_483_647;

/** Mintpay customer_id: digits only, max 10 chars, fits signed 32-bit int. */
export function normalizeMintpayCustomerId(raw: unknown): string {
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
  const asInt = Number(source.slice(-10)) % MINTPAY_SIGNED_INT_MAX;
  return String(asInt || 1);
}

/** Mintpay expects a local mobile number — digits only, 10 chars. */
export function normalizeMintpayTelephone(raw: unknown): string {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '0771234567';
  if (digits.startsWith('94') && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length > 10) digits = digits.slice(-10);
  if (digits.length < 10) digits = digits.padStart(10, '0');
  return digits;
}

function mintpayShopEmailHost(): string {
  try {
    const url = appConfig.email?.shopUrl?.trim();
    if (url) return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* use default */
  }
  return 'fe.lk';
}

/**
 * Mintpay caps customer_email at 40 chars. One-click guest sessions use
 * guest-{uuid}@guest.fe.lk (~55 chars) which their API rejects with HTTP 400.
 */
export function resolveMintpayEmail(
  email: string,
  metadata?: { customerId?: unknown; customerPhone?: unknown; phone?: unknown },
): string {
  const trimmed = email.trim();
  if (trimmed.length <= MINTPAY_EMAIL_MAX_LEN && !trimmed.endsWith('@guest.fe.lk')) {
    return trimmed;
  }

  const host = mintpayShopEmailHost();
  const phoneDigits = String(metadata?.customerPhone ?? metadata?.phone ?? '').replace(/\D/g, '');
  const id = normalizeMintpayCustomerId(metadata?.customerId ?? trimmed);
  const local = phoneDigits.length >= 9 ? `g+${normalizeMintpayTelephone(phoneDigits)}` : `g+${id}`;
  const candidate = `${local}@${host}`;
  if (candidate.length <= MINTPAY_EMAIL_MAX_LEN) return candidate;
  const maxLocal = MINTPAY_EMAIL_MAX_LEN - host.length - 1;
  return `${local.slice(0, maxLocal)}@${host}`;
}
