import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { anonymizeIp, getClientIp } from '@/services/platform-analytics/geoip.util.js';

/** SHA-256 hash of anonymized IP — used for anonymous flash-sale persistence. */
export function hashIp(ip: string | undefined): string {
  return createHash('sha256').update(anonymizeIp(ip)).digest('hex').slice(0, 32);
}

export function hashIpFromRequest(req: Request): string {
  return hashIp(getClientIp(req));
}
