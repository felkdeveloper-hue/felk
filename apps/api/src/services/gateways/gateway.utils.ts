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
      appConfig.email.shopUrl?.trim() ||
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
