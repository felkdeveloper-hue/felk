import { VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch, resolveDateRange, type MongoMatch } from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';

/**
 * Unique visitors by first-touch source for the selected period.
 * Counts landings (not only guests/customers). One IP = one count.
 */
export async function getTrafficSources(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const base = await buildVisitorMatch(filter, range);
  // Drop lastSeenAt-only window from buildVisitorMatch; landings use firstSeenAt.
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
        },
      },
    },
  ]);

  const merged = new Map<
    string,
    { source: string; label: string; channel: string; keys: Set<string> }
  >();

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

  // One IP should not inflate both Direct and Instagram — non-direct wins.
  const ipOwner = new Map<string, string>();
  const ordered = [...merged.values()].sort((a, b) => {
    const aDirect = a.label === 'Direct' ? 1 : 0;
    const bDirect = b.label === 'Direct' ? 1 : 0;
    return aDirect - bDirect;
  });
  for (const row of ordered) {
    for (const key of [...row.keys]) {
      if (!key.startsWith('ip:')) continue;
      const owner = ipOwner.get(key);
      if (!owner) {
        ipOwner.set(key, row.label);
        continue;
      }
      if (owner !== row.label && row.label === 'Direct') {
        row.keys.delete(key);
      } else if (owner === 'Direct' && row.label !== 'Direct') {
        merged.get('Direct')?.keys.delete(key);
        ipOwner.set(key, row.label);
      }
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
