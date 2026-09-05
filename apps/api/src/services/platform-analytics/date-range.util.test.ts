import { describe, expect, it } from 'vitest';
import { calendarDateInTz, startOfAnalyticsDay } from './date-range.util.js';

describe('analytics day boundaries (Asia/Colombo)', () => {
  it('keeps a 1:00 AM Sri Lanka order on the same calendar day as evening', () => {
    const lateNight = new Date('2026-09-05T01:00:00+05:30');
    const evening = new Date('2026-09-05T23:31:00+05:30');

    expect(calendarDateInTz(lateNight)).toBe('2026-09-05');
    expect(calendarDateInTz(evening)).toBe('2026-09-05');
    expect(startOfAnalyticsDay(evening).getTime()).toBeLessThanOrEqual(lateNight.getTime());
  });

  it('does not treat late-night SL orders as UTC yesterday', () => {
    const lateNight = new Date('2026-09-05T01:00:00+05:30');
    const utcMidnight = new Date('2026-09-05T00:00:00Z');

    expect(lateNight.getTime()).toBeLessThan(utcMidnight.getTime());
    expect(lateNight.getTime()).toBeGreaterThanOrEqual(startOfAnalyticsDay(lateNight).getTime());
    expect(calendarDateInTz(new Date(startOfAnalyticsDay(lateNight).getTime() - 1))).toBe(
      '2026-09-04',
    );
  });
});

