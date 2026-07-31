import { EventModel, SessionModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  buildEventMatch,
  buildSessionMatch,
  mergeMatch,
  resolveDateRange,
} from './analytics-query.builder.js';

export async function getReturningJourney(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const eventBase = await buildEventMatch(filter);
  delete eventBase['name'];

  // Prefer explicit session_start returnBucket properties
  const fromEvents = await EventModel.aggregate<{ _id: string; count: number }>([
    {
      $match: mergeMatch(eventBase, {
        name: 'session_start',
        'properties.returnBucket': { $in: ['1h', '1d', '7d', '30d'] },
      }),
    },
    { $group: { _id: '$properties.returnBucket', count: { $sum: 1 } } },
  ]);

  const buckets = { '1h': 0, '1d': 0, '7d': 0, '30d': 0 };
  for (const row of fromEvents) {
    if (row._id in buckets) {
      buckets[row._id as keyof typeof buckets] = row.count;
    }
  }

  // Fallback / supplement from session gaps when event counts are sparse
  if (Object.values(buckets).every((v) => v === 0)) {
    const sessions = await SessionModel.find(buildSessionMatch(filter, range))
      .select('visitorId startedAt')
      .sort({ visitorId: 1, startedAt: 1 })
      .lean();

    const lastByVisitor = new Map<string, Date>();
    for (const s of sessions) {
      const prev = lastByVisitor.get(s.visitorId);
      if (prev) {
        const gap = s.startedAt.getTime() - prev.getTime();
        if (gap >= 60 * 60 * 1000 && gap < 24 * 60 * 60 * 1000) buckets['1h']++;
        else if (gap >= 24 * 60 * 60 * 1000 && gap < 7 * 24 * 60 * 60 * 1000) buckets['1d']++;
        else if (gap >= 7 * 24 * 60 * 60 * 1000 && gap < 30 * 24 * 60 * 60 * 1000) buckets['7d']++;
        else if (gap >= 30 * 24 * 60 * 60 * 1000) buckets['30d']++;
      }
      lastByVisitor.set(s.visitorId, s.startedAt);
    }
  }

  const total = buckets['1h'] + buckets['1d'] + buckets['7d'] + buckets['30d'];

  return {
    buckets: [
      { bucket: '1h', label: 'After 1 hour', count: buckets['1h'] },
      { bucket: '1d', label: 'After 1 day', count: buckets['1d'] },
      { bucket: '7d', label: 'After 7 days', count: buckets['7d'] },
      { bucket: '30d', label: 'After 30 days', count: buckets['30d'] },
    ],
    total,
  };
}
