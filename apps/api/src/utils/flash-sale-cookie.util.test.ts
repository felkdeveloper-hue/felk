import { describe, expect, it } from 'vitest';
import {
  parseFlashSaleCookie,
  signFlashSaleStart,
} from '@/utils/flash-sale-cookie.util.js';

describe('flash-sale cookie', () => {
  it('round-trips a still-active start time', () => {
    const start = new Date(Date.now() - 10 * 60 * 1000);
    const raw = signFlashSaleStart(start);
    const parsed = parseFlashSaleCookie(raw);
    expect(parsed?.getTime()).toBe(start.getTime());
  });

  it('rejects a tampered signature', () => {
    const start = new Date();
    const [ms] = signFlashSaleStart(start).split('.');
    expect(parseFlashSaleCookie(`${ms}.deadbeefdeadbeefdeadbeefdeadbeef`)).toBeNull();
  });

  it('rejects an expired window', () => {
    const start = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(parseFlashSaleCookie(signFlashSaleStart(start))).toBeNull();
  });
});
