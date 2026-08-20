import { VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch } from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';

export async function getTrafficSources(filter: AnalyticsFilter) {
  const match = await buildVisitorMatch(filter);

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
    count: number;
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
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const merged = new Map<
    string,
    { source: string; label: string; channel: string; count: number }
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
      existing.count += row.count;
    } else {
      merged.set(attribution.label, {
        source: row._id.trafficSource || 'direct',
        label: attribution.label,
        channel: attribution.channel,
        count: row.count,
      });
    }
  }

  const ranked = [...merged.values()].sort((a, b) => b.count - a.count);
  const total = ranked.reduce((sum, row) => sum + row.count, 0);

  return ranked.map((row) => ({
    ...row,
    pct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
  }));
}
