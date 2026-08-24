import { VisitorModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch, resolveDateRange, type MongoMatch } from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';

type SourceRow = {
  source: string;
  label: string;
  channel: string;
  keys: Set<string>;
};

/**
 * Traffic sources for the selected period — visitor-based (same model as production).
 *
 * - Counts landings / active visitors, whether or not they create an account.
 * - Ads / social / search: unique browsers (visitorId).
 * - Direct: unique IPs.
 * - Also includes registered/guest users whose saved acquisition source falls
 *   in the period (lastLoginAt), so Users-row sources are not missing from
 *   Sources when their visitor row was mis-labeled Direct.
 */
export async function getTrafficSources(filter: AnalyticsFilter) {
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
      for (const key of row.uniqueKeys) existing.keys.add(key);
    } else {
      merged.set(attribution.label, {
        source: row._id.trafficSource || 'direct',
        label: attribution.label,
        channel: attribution.channel,
        keys: new Set(row.uniqueKeys),
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
      // Prefer non-direct: if this IP was only in Direct, still add user key here.
      existing.keys.add(key);
    } else {
      merged.set(label, {
        source: acq?.trafficSource || 'paid_social',
        label,
        channel: acq?.sourceChannel || '',
        keys: new Set([key]),
      });
    }
  }

  const ranked = [...merged.values()]
    .map((row) => ({
      source: row.source,
      label: row.label,
      channel: row.channel,
      count: row.keys.size,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  const total = ranked.reduce((sum, row) => sum + row.count, 0);

  return ranked.map((row) => ({
    ...row,
    pct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
  }));
}
