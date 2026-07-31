import { EventModel } from '@/models/analytics/index.js';
import type { EventsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, resolveDateRange } from './analytics-query.builder.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export async function getEvents(filter: EventsFilter) {
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;
  const query = await buildEventMatch(filter);

  const [data, total] = await Promise.all([
    EventModel.find(query).sort({ occurredAt: -1 }).skip(skip).limit(limit).lean(),
    EventModel.countDocuments(query),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}

export async function getEventNames(filter: EventsFilter): Promise<string[]> {
  const range = resolveDateRange(filter);
  return EventModel.distinct('name', { occurredAt: { $gte: range.from, $lte: range.to } });
}

export async function getEventBreakdown(filter: EventsFilter) {
  const matchStage = await buildEventMatch(filter);
  // Breakdown groups by name — drop fixed eventName so all names appear
  delete matchStage['name'];

  return EventModel.aggregate([
    { $match: matchStage },
    { $group: { _id: '$name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
    { $project: { name: '$_id', count: 1, _id: 0 } },
  ]);
}
