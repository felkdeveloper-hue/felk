import { createHash } from 'node:crypto';

/**
 * SHA-256 hash a PII value for use in Conversions APIs.
 * Normalizes: lowercase, trim whitespace. Returns null for empty/null.
 */
export function hashPii(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}

export function hashPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Strip non-numeric characters except leading +
  const normalized = phone.trim().replace(/[^0-9+]/g, '');
  if (!normalized) return null;
  return createHash('sha256').update(normalized).digest('hex');
}
