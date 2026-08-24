import type { AnalyticsFilter } from '@/schemas/analytics/index.js';

export interface DateRange {
  from: Date;
  to: Date;
}

/** Business timezone for fe.lk analytics day boundaries. */
export const ANALYTICS_TIMEZONE = 'Asia/Colombo';
const COLOMBO_OFFSET = '+05:30';

/** Calendar YYYY-MM-DD in the analytics timezone. */
function calendarDateInTz(date: Date, timeZone = ANALYTICS_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Midnight (start of calendar day) in Asia/Colombo, as a UTC Date. */
function startOfZonedDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${COLOMBO_OFFSET}`);
}

function addCalendarDays(ymd: string, days: number): string {
  const base = startOfZonedDay(ymd);
  const shifted = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return calendarDateInTz(shifted);
}

export function resolveDateRange(
  filter: Pick<AnalyticsFilter, 'period' | 'from' | 'to'>,
): DateRange {
  const now = new Date();
  const todayYmd = calendarDateInTz(now);

  switch (filter.period) {
    case 'today':
      return { from: startOfZonedDay(todayYmd), to: now };

    case 'yesterday': {
      const yYmd = addCalendarDays(todayYmd, -1);
      const yStart = startOfZonedDay(yYmd);
      const yEnd = new Date(startOfZonedDay(todayYmd).getTime() - 1);
      return { from: yStart, to: yEnd };
    }

    case '7d': {
      const startYmd = addCalendarDays(todayYmd, -6);
      return { from: startOfZonedDay(startYmd), to: now };
    }

    case '30d': {
      const startYmd = addCalendarDays(todayYmd, -29);
      return { from: startOfZonedDay(startYmd), to: now };
    }

    case '90d': {
      const startYmd = addCalendarDays(todayYmd, -89);
      return { from: startOfZonedDay(startYmd), to: now };
    }

    case 'custom': {
      if (filter.from && filter.to) {
        return { from: new Date(filter.from), to: new Date(filter.to) };
      }
      const startYmd = addCalendarDays(todayYmd, -6);
      return { from: startOfZonedDay(startYmd), to: now };
    }

    default: {
      const startYmd = addCalendarDays(todayYmd, -6);
      return { from: startOfZonedDay(startYmd), to: now };
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
