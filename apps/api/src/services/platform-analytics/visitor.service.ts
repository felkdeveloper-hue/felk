import { VisitorModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch } from './analytics-query.builder.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export async function getVisitors(filter: AnalyticsFilter) {
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;
  const query = buildVisitorMatch(filter);

  const [data, total] = await Promise.all([
    VisitorModel.find(query).sort({ lastSeenAt: -1 }).skip(skip).limit(limit).lean(),
    VisitorModel.countDocuments(query),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}
