import { PageViewModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { resolveDateRange } from './date-range.util.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export interface PageStat {
  path: string;
  totalViews: number;
  uniqueViews: number;
  avgTimeOnPageMs: number;
  exitRate: number;
  entryRate: number;
  bounceRate: number;
}

export async function getPages(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;

  const matchStage: Record<string, unknown> = { viewedAt: { $gte: range.from, $lte: range.to } };
  if (filter.country) matchStage['country'] = filter.country;
  if (filter.device) matchStage['deviceType'] = filter.device;

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$path',
        totalViews: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$visitorId' },
        totalTimeMs: { $sum: { $ifNull: ['$timeOnPageMs', 0] } },
        exitCount: { $sum: { $cond: ['$isExit', 1, 0] } },
        entryCount: { $sum: { $cond: ['$isEntry', 1, 0] } },
      },
    },
    {
      $project: {
        path: '$_id',
        totalViews: 1,
        uniqueViews: { $size: '$uniqueVisitors' },
        avgTimeOnPageMs: {
          $cond: [{ $gt: ['$totalViews', 0] }, { $divide: ['$totalTimeMs', '$totalViews'] }, 0],
        },
        exitRate: {
          $cond: [
            { $gt: ['$totalViews', 0] },
            { $multiply: [{ $divide: ['$exitCount', '$totalViews'] }, 100] },
            0,
          ],
        },
        entryRate: {
          $cond: [
            { $gt: ['$totalViews', 0] },
            { $multiply: [{ $divide: ['$entryCount', '$totalViews'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { totalViews: -1 as const } },
  ];

  const allPages = await PageViewModel.aggregate<PageStat>(pipeline);
  const total = allPages.length;
  const data = allPages.slice(skip, skip + limit);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}
