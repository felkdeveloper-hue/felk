import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';

export function generateId(): string {
  return randomUUID();
}

export function generateObjectIdLike(): string {
  return randomBytes(12).toString('hex');
}

export function generateOrderNumber(prefix = 'FE'): string {
  const year = new Date().getUTCFullYear();
  const seq = randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `${prefix}-${year}-${seq}`;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
