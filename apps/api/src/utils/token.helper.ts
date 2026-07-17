import { createHash, randomBytes } from 'node:crypto';

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTokenHash(token: string, tokenHash: string): boolean {
  return hashToken(token) === tokenHash;
}
