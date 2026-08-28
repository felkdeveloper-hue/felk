import { VisitorModel, SessionModel, PageViewModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch, resolveDateRange, type MongoMatch } from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';
import { ANALYTICS_TIMEZONE } from './date-range.util.js';

type SourceRow = {
  source: string;
  label: string;
  channel: string;
  /** Unique visitor keys (v:/ip:/u:) */
  visitorKeys: Set<string>;
  visitorIds: Set<string>;
};

export type TrafficSourceResult = {
  source: string;
  label: string;
  channel: string;
  /** @deprecated Prefer uniqueVisitors — kept for backward-compatible dashboards/widgets. */
  count: number;
  /** Unique browsers (or unique IPs for Direct). First-party tracking only. */
  uniqueVisitors: number;
  /** Sessions attributed to visitors in this source for the period. */
  visits: number;
  /** Page views from those visitors in the period. */
  pageViews: number;
  pct: number;
  metric: 'website_unique_visitors';
};

/**
 * Traffic sources for the selected period — first-party website tracking only.
 *
 * These numbers are NOT Meta Reach / Impressions / Ad Manager metrics.
 *
 * - Ads / social / search: unique browsers (visitorId).
 * - Direct: unique IPs.
 * - Also includes registered/guest users whose saved acquisition source falls
 *   in the period (lastLoginAt), so Users-row sources are not missing from
 *   Sources when their visitor row was mis-labeled Direct.
 */
export async function getTrafficSources(filter: AnalyticsFilter): Promise<TrafficSourceResult[]> {
  const range = resolveDateRange(filter);
  const base = await buildVisitorMatch(filter, range);
  const {
    lastSeenAt: _ignored,
    $or: searchOr,
    ...rest
  } = base as MongoMatch & {
    lastSeenAt?: unknown;
    $or?: unknown;
  };

  const dateOr = [
    { firstSeenAt: { $gte: range.from, $lte: range.to } },
    {
      lastSeenAt: { $gte: range.from, $lte: range.to },
      trafficSource: { $exists: true, $nin: ['direct', null, ''] },
    },
  ];

  const match: MongoMatch = {
    ...rest,
    ...(Array.isArray(searchOr) ? { $and: [{ $or: searchOr }, { $or: dateOr }] } : { $or: dateOr }),
  };

  const results = await VisitorModel.aggregate<{
    _id: {
      trafficSource: string;
      utmSource: string;
      utmMedium: string;
      utmCampaign: string;
      referrer: string;
      inAppSource: string;
      hasFbclid: boolean;
      hasGclid: boolean;
      hasTtclid: boolean;
    };
    uniqueKeys: string[];
    visitorIds: string[];
  }>([
    { $match: match },
    {
      $group: {
        _id: {
          trafficSource: { $ifNull: ['$trafficSource', 'direct'] },
          utmSource: { $ifNull: ['$utmSource', ''] },
          utmMedium: { $ifNull: ['$utmMedium', ''] },
          utmCampaign: { $ifNull: ['$utmCampaign', ''] },
          referrer: { $ifNull: ['$referrer', ''] },
          inAppSource: { $ifNull: ['$inAppSource', ''] },
          hasFbclid: { $gt: [{ $strLenCP: { $ifNull: ['$fbclid', ''] } }, 0] },
          hasGclid: { $gt: [{ $strLenCP: { $ifNull: ['$gclid', ''] } }, 0] },
          hasTtclid: { $gt: [{ $strLenCP: { $ifNull: ['$ttclid', ''] } }, 0] },
        },
        uniqueKeys: {
          $addToSet: {
            $cond: [
              {
                $ne: [{ $ifNull: ['$trafficSource', 'direct'] }, 'direct'],
              },
              { $concat: ['v:', '$visitorId'] },
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$ipHash', null] },
                      { $ne: ['$ipHash', ''] },
                      { $ne: ['$ipHash', 'unknown'] },
                    ],
                  },
                  { $concat: ['ip:', '$ipHash'] },
                  { $concat: ['v:', '$visitorId'] },
                ],
              },
            ],
          },
        },
        visitorIds: { $addToSet: '$visitorId' },
      },
    },
  ]);

  const merged = new Map<string, SourceRow>();

  for (const row of results) {
    const attribution = formatAttribution({
      trafficSource: row._id.trafficSource || 'direct',
      utmSource: row._id.utmSource || null,
      utmMedium: row._id.utmMedium || null,
      utmCampaign: row._id.utmCampaign || null,
      referrer: row._id.referrer || null,
      inAppSource: row._id.inAppSource || null,
      fbclid: row._id.hasFbclid ? '1' : null,
      gclid: row._id.hasGclid ? '1' : null,
      ttclid: row._id.hasTtclid ? '1' : null,
    });
    const existing = merged.get(attribution.label);
    if (existing) {
      for (const key of row.uniqueKeys) existing.visitorKeys.add(key);
      for (const id of row.visitorIds) existing.visitorIds.add(id);
    } else {
      merged.set(attribution.label, {
        source: row._id.trafficSource || 'direct',
        label: attribution.label,
        channel: attribution.channel,
        visitorKeys: new Set(row.uniqueKeys),
        visitorIds: new Set(row.visitorIds),
      });
    }
  }

  // Users / guests who show a real source in Admin → Users but whose visitor
  // row is missing or Direct: add them from saved acquisition (real data only).
  const users = await UserModel.find({
    isDeleted: false,
    lastLoginAt: { $gte: range.from, $lte: range.to },
    'metadata.acquisition.sourceLabel': {
      $exists: true,
      $nin: [null, '', 'Direct', 'Unknown'],
    },
  })
    .select('metadata.acquisition')
    .lean();

  for (const user of users) {
    const acq = (user.metadata as Record<string, unknown> | undefined)?.acquisition as
      | {
          sourceLabel?: string | null;
          sourceChannel?: string | null;
          trafficSource?: string | null;
          visitorId?: string | null;
        }
      | undefined;
    const label = acq?.sourceLabel?.trim();
    if (!label || label === 'Direct' || label === 'Unknown') continue;

    const key = acq?.visitorId ? `v:${acq.visitorId}` : `u:${String(user._id)}`;
    const existing = merged.get(label);
    if (existing) {
      existing.visitorKeys.add(key);
      if (acq?.visitorId) existing.visitorIds.add(acq.visitorId);
    } else {
      merged.set(label, {
        source: acq?.trafficSource || 'paid_social',
        label,
        channel: acq?.sourceChannel || '',
        visitorKeys: new Set([key]),
        visitorIds: new Set(acq?.visitorId ? [acq.visitorId] : []),
      });
    }
  }

  const allVisitorIds = [...new Set([...merged.values()].flatMap((r) => [...r.visitorIds]))];

  const sessionCounts = new Map<string, number>();
  const pageViewCounts = new Map<string, number>();

  if (allVisitorIds.length) {
    const [sessions, pageViews] = await Promise.all([
      SessionModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            visitorId: { $in: allVisitorIds },
            startedAt: { $gte: range.from, $lte: range.to },
          },
        },
        { $group: { _id: '$visitorId', count: { $sum: 1 } } },
      ]),
      PageViewModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            visitorId: { $in: allVisitorIds },
            viewedAt: { $gte: range.from, $lte: range.to },
          },
        },
        { $group: { _id: '$visitorId', count: { $sum: 1 } } },
      ]),
    ]);
    for (const s of sessions) sessionCounts.set(s._id, s.count);
    for (const p of pageViews) pageViewCounts.set(p._id, p.count);
  }

  const ranked = [...merged.values()]
    .map((row) => {
      let visits = 0;
      let pageViews = 0;
      for (const vid of row.visitorIds) {
        visits += sessionCounts.get(vid) ?? 0;
        pageViews += pageViewCounts.get(vid) ?? 0;
      }
      // Fallback: if we have unique visitors but no session docs yet, treat unique as visits.
      const uniqueVisitors = row.visitorKeys.size;
      if (visits === 0 && uniqueVisitors > 0) visits = uniqueVisitors;

      return {
        source: row.source,
        label: row.label,
        channel: row.channel,
        uniqueVisitors,
        visits,
        pageViews,
        count: uniqueVisitors,
        metric: 'website_unique_visitors' as const,
      };
    })
    .filter((row) => row.uniqueVisitors > 0)
    .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors);

  const total = ranked.reduce((sum, row) => sum + row.uniqueVisitors, 0);

  return ranked.map((row) => ({
    ...row,
    pct: total > 0 ? Math.round((row.uniqueVisitors / total) * 1000) / 10 : 0,
  }));
}

export function getTrafficTimezone(): string {
  return ANALYTICS_TIMEZONE;
}
