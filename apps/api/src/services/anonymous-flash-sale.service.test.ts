import { describe, expect, it } from 'vitest';
import {
  applyLoginBonusIfLowTime,
  earliestActiveStart,
  LOGIN_BONUS_MS,
  remainingMs,
} from '@/services/anonymous-flash-sale.service.js';
import { FLASH_SALE_DISCOUNT } from '@/constants/checkout.js';

describe('anonymous flash sale helpers', () => {
  it('keeps the earliest still-active start so login cannot reset the clock', () => {
    const older = new Date(Date.now() - 20 * 60 * 1000);
    const newer = new Date(Date.now() - 5 * 60 * 1000);
    const expired = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(earliestActiveStart([newer, older, expired])?.getTime()).toBe(older.getTime());
  });

  it('does not apply a login bonus when more than 5 minutes remain', () => {
    const start = new Date(Date.now() - 10 * 60 * 1000);
    const result = applyLoginBonusIfLowTime(start);
    expect(result.loginBonusApplied).toBe(false);
    expect(result.startTime.getTime()).toBe(start.getTime());
  });

  it('extends a nearly-expired window without jumping back to a full hour', () => {
    const start = new Date(Date.now() - (FLASH_SALE_DISCOUNT.DURATION_MS - 2 * 60 * 1000));
    const result = applyLoginBonusIfLowTime(start);
    expect(result.loginBonusApplied).toBe(true);
    expect(remainingMs(result.startTime)).toBeGreaterThan(remainingMs(start));
    expect(remainingMs(result.startTime)).toBeLessThan(FLASH_SALE_DISCOUNT.DURATION_MS);
    expect(result.startTime.getTime()).toBe(start.getTime() + LOGIN_BONUS_MS);
  });
});
