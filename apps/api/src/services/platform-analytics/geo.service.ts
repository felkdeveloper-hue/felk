import { VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch } from './analytics-query.builder.js';

export async function getGeoBreakdown(filter: AnalyticsFilter) {
  const match = await buildVisitorMatch(filter);

  const [countries, cities] = await Promise.all([
    VisitorModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$geo.countryCode',
          country: { $first: '$geo.country' },
          countryCode: { $first: '$geo.countryCode' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, country: 1, countryCode: 1, count: 1 } },
    ]),
    VisitorModel.aggregate([
      { $match: { ...match, 'geo.city': { $ne: null } } },
      {
        $group: {
          _id: { city: '$geo.city', country: '$geo.countryCode' },
          city: { $first: '$geo.city' },
          country: { $first: '$geo.country' },
          countryCode: { $first: '$geo.countryCode' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, city: 1, country: 1, countryCode: 1, count: 1 } },
    ]),
  ]);

  const totalVisitors = countries.reduce((s: number, c: { count: number }) => s + c.count, 0);

  return {
    countries: countries.map(
      (c: { count: number; country: string | null; countryCode: string | null }) => ({
        ...c,
        pct: totalVisitors > 0 ? Math.round((c.count / totalVisitors) * 100 * 10) / 10 : 0,
      }),
    ),
    cities,
  };
}
