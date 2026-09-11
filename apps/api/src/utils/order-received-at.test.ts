import { describe, expect, it } from 'vitest';
import { formatReceivedAtTimestamp } from '@/utils/order-received-at.js';

describe('formatReceivedAtTimestamp', () => {
  it('formats the customer received time in Asia/Colombo', () => {
    // 2026-09-11 01:20 AM Sri Lanka = 2026-09-10 19:50 UTC
    const utc = new Date('2026-09-10T19:50:00.000Z');
    expect(formatReceivedAtTimestamp(utc)).toBe('2026-09-11 01:20:00');
  });

  it('returns empty string when missing', () => {
    expect(formatReceivedAtTimestamp(null)).toBe('');
    expect(formatReceivedAtTimestamp(undefined)).toBe('');
  });
});
