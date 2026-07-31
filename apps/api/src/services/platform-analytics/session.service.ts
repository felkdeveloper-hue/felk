import { SessionModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildSessionMatch } from './analytics-query.builder.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export async function getSessions(filter: AnalyticsFilter) {
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;
  const query = buildSessionMatch(filter);

  const [data, total] = await Promise.all([
    SessionModel.find(query).sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
    SessionModel.countDocuments(query),
  ]);

  const userIds = [
    ...new Set(
      data
        .map((s) => (s.userId ? String(s.userId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const users =
    userIds.length > 0
      ? await UserModel.find({ _id: { $in: userIds } })
          .select('email')
          .lean()
      : [];
  const emailById = new Map(users.map((u) => [String(u._id), u.email as string]));

  const enriched = data.map((s) => ({
    ...s,
    customerEmail: s.userId ? (emailById.get(String(s.userId)) ?? null) : null,
  }));

  return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
}
