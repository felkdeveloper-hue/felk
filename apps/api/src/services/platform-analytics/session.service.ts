import { SessionModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { resolveDateRange } from './date-range.util.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export async function getSessions(filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { startedAt: { $gte: range.from, $lte: range.to } };
  if (filter.country) query['country'] = filter.country;
  if (filter.device) query['deviceType'] = filter.device;
  if (filter.browser) query['browser'] = { $regex: filter.browser, $options: 'i' };
  if (filter.userId) query['userId'] = filter.userId;

  const [data, total] = await Promise.all([
    SessionModel.find(query).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
    SessionModel.countDocuments(query),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}
