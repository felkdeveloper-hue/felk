import { describe, expect, it } from 'vitest';
import { kokoStuckPaymentIsDue } from '@/utils/koko-auto-recover.js';

describe('kokoStuckPaymentIsDue', () => {
  const now = new Date('2026-08-17T18:30:00.000Z');

  it('waits at least 10 minutes so live OTP / webhook / return can finish first', () => {
    expect(kokoStuckPaymentIsDue(new Date('2026-08-17T18:25:00.000Z'), now)).toBe(false);
  });

  it('recovers a stuck Koko payment after 10 minutes without a merchant ID allowlist', () => {
    expect(kokoStuckPaymentIsDue(new Date('2026-08-17T18:15:00.000Z'), now)).toBe(true);
  });

  it('ignores abandoned Koko clicks older than 48 hours', () => {
    expect(kokoStuckPaymentIsDue(new Date('2026-08-14T18:30:00.000Z'), now)).toBe(false);
  });
});
