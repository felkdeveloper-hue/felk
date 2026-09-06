import type { Request, Response } from 'express';
import { FLASH_SALE_DISCOUNT } from '@/constants/checkout.js';
import { appConfig } from '@/config/app.config.js';
import { hmacSha256Hex, safeCompare } from '@/utils/crypto.helper.js';

/** Browser cookie that preserves the personal flash-sale start time across IP changes. */
export const FLASH_SALE_COOKIE = 'fe_flash_sale';

function remainingMs(startTime: Date): number {
  return Math.max(0, FLASH_SALE_DISCOUNT.DURATION_MS - (Date.now() - startTime.getTime()));
}

export function signFlashSaleStart(startTime: Date): string {
  const startMs = startTime.getTime();
  const sig = hmacSha256Hex(appConfig.cookie.secret, `flash-sale:${startMs}`).slice(0, 32);
  return `${startMs}.${sig}`;
}

export function parseFlashSaleCookie(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.includes('.')) return null;
  const [msStr, sig] = raw.split('.');
  const startMs = Number(msStr);
  if (!Number.isFinite(startMs) || !sig) return null;
  const expected = hmacSha256Hex(appConfig.cookie.secret, `flash-sale:${startMs}`).slice(0, 32);
  if (!safeCompare(sig, expected)) return null;
  const startTime = new Date(startMs);
  if (remainingMs(startTime) <= 0) return null;
  return startTime;
}

/** Read a still-active signed flash-sale start time from the request cookie. */
export function readFlashSaleCookie(req: Request): Date | null {
  return parseFlashSaleCookie(req.cookies?.[FLASH_SALE_COOKIE]);
}

export function setFlashSaleCookie(res: Response, startTime: Date): void {
  const remaining = remainingMs(startTime);
  if (remaining <= 0) {
    clearFlashSaleCookie(res);
    return;
  }
  res.cookie(FLASH_SALE_COOKIE, signFlashSaleStart(startTime), {
    httpOnly: true,
    sameSite: appConfig.cookie.sameSite,
    secure: appConfig.cookie.secure,
    maxAge: remaining,
    path: '/',
  });
}

export function clearFlashSaleCookie(res: Response): void {
  res.cookie(FLASH_SALE_COOKIE, '', {
    httpOnly: true,
    sameSite: appConfig.cookie.sameSite,
    secure: appConfig.cookie.secure,
    maxAge: 0,
    path: '/',
  });
}

export function applyFlashSaleCookie(
  res: Response,
  status: { flashSaleStartTime: string | null; isActive?: boolean },
): void {
  if (status.flashSaleStartTime && status.isActive !== false) {
    const startTime = new Date(status.flashSaleStartTime);
    if (remainingMs(startTime) > 0) {
      setFlashSaleCookie(res, startTime);
      return;
    }
  }
  clearFlashSaleCookie(res);
}
