import { VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { resolveDateRange } from './date-range.util.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export async function getVisitors(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { lastSeenAt: { $gte: range.from, $lte: range.to } };
  if (filter.country) query['geo.countryCode'] = filter.country;
  if (filter.device) query['device.type'] = filter.device;
  if (filter.browser) query['device.browser'] = { $regex: filter.browser, $options: 'i' };
  if (filter.userId) query['userId'] = filter.userId;

  const [data, total] = await Promise.all([
    VisitorModel.find(query).sort({ lastSeenAt: -1 }).skip(skip).limit(limit).lean(),
    VisitorModel.countDocuments(query),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}
