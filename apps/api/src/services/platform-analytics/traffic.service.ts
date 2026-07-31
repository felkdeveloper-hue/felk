import { VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch } from './analytics-query.builder.js';

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Direct',
  organic_search: 'Organic Search',
  paid_search: 'Paid Ads',
  social: 'Social Media',
  email: 'Email',
  referral: 'Referral',
  display: 'Display',
};

export async function getTrafficSources(filter: AnalyticsFilter) {
  const match = buildVisitorMatch(filter);

  const results = await VisitorModel.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: '$trafficSource', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const total = results.reduce((s, r) => s + r.count, 0);

  return results.map((r) => ({
    source: r._id ?? 'direct',
    label: SOURCE_LABELS[r._id ?? ''] ?? r._id ?? 'Direct',
    count: r.count,
    pct: total > 0 ? Math.round((r.count / total) * 100 * 10) / 10 : 0,
  }));
}
