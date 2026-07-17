import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { appConfig } from '@/config/app.config';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  return createHash('sha256').update(appConfig.cookie.secret).digest();
}

/** Encrypt sensitive setting values (SMTP passwords, API keys). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith('enc:')) return payload;
  const [, ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) return payload;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

export function maskSecret(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.startsWith('enc:') || value.length > 4) return '********';
  return '****';
}

/** Uppercase MD5 hex digest — used by PayHere's webhook signature scheme. */
export function md5Hex(input: string): string {
  return createHash('md5').update(input).digest('hex').toUpperCase();
}

/** HMAC-SHA256 hex digest — used by Koko/Mintpay-style webhook signatures. */
export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Constant-time comparison of two hex/base64 strings.
 * Prevents timing attacks against webhook signature verification.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers to avoid leaking length via timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
