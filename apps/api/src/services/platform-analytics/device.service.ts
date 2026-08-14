import { VisitorModel, SessionModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch, buildSessionMatch } from './analytics-query.builder.js';

interface Breakdown {
  label: string;
  count: number;
  pct: number;
}

function toPct(items: Array<{ _id: string | null; count: number }>): Breakdown[] {
  const total = items.reduce((s, i) => s + i.count, 0);
  return items.map((i) => ({
    label: i._id ?? 'unknown',
    count: i.count,
    pct: total > 0 ? Math.round((i.count / total) * 100 * 10) / 10 : 0,
  }));
}

export async function getDeviceBreakdown(filter: AnalyticsFilter) {
  const match = await buildVisitorMatch(filter);

  const [deviceTypes, browsers, operatingSystems] = await Promise.all([
    VisitorModel.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: '$device.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    VisitorModel.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: '$device.browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    VisitorModel.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: '$device.os', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    deviceTypes: toPct(deviceTypes),
    browsers: toPct(browsers),
    operatingSystems: toPct(operatingSystems),
  };
}

export async function getSessionDeviceBreakdown(filter: AnalyticsFilter) {
  const match = buildSessionMatch(filter);

  const [deviceTypes, browsers] = await Promise.all([
    SessionModel.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    SessionModel.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return { deviceTypes: toPct(deviceTypes), browsers: toPct(browsers) };
}
