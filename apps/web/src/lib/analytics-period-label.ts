import type { AnalyticsFilter } from '@/services/sdk/admin';

/** Human-readable period for analytics / dashboard widget hints. */
export function formatAnalyticsPeriodLabel(
  filter: Pick<AnalyticsFilter, 'period' | 'from' | 'to'> | undefined,
): string {
  const period = filter?.period ?? '7d';
  switch (period) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
    case 'custom':
      if (filter?.from && filter?.to) {
        const from = new Date(filter.from).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        const to = new Date(filter.to).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
        return `${from} – ${to}`;
      }
      return 'Custom range';
    default:
      return 'Last 7 days';
  }
}

export function withPeriodHint(base: string, periodLabel: string): string {
  return `${base} · ${periodLabel}`;
}
