import type { AnalyticsFilter } from '@/schemas/analytics/index.js';

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveDateRange(
  filter: Pick<AnalyticsFilter, 'period' | 'from' | 'to'>,
): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter.period) {
    case 'today':
      return { from: today, to: now };

    case 'yesterday': {
      const yStart = new Date(today);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(today);
      yEnd.setMilliseconds(-1);
      return { from: yStart, to: yEnd };
    }

    case '7d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { from: start, to: now };
    }

    case '30d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { from: start, to: now };
    }

    case 'custom': {
      if (filter.from && filter.to) {
        return { from: new Date(filter.from), to: new Date(filter.to) };
      }
      const start7 = new Date(today);
      start7.setDate(start7.getDate() - 6);
      return { from: start7, to: now };
    }

    default: {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { from: start, to: now };
    }
  }
}

/** Return a comparison range the same length as the main range, shifted back. */
export function getComparisonRange(range: DateRange): DateRange {
  const lengthMs = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - lengthMs),
    to: new Date(range.from.getTime() - 1),
  };
}

export function getPctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
