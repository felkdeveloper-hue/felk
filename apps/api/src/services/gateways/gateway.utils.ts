import type { WebhookVerificationInput } from '@/services/interfaces/payment-gateway.service';

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
