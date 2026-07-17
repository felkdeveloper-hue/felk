import { createHash, randomInt } from 'node:crypto';

export function generateNumericOtp(length = 6): string {
  const max = 10 ** length;
  return randomInt(0, max).toString().padStart(length, '0');
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function verifyOtp(code: string, codeHash: string): boolean {
  return hashOtp(code) === codeHash;
}
