import { Types } from 'mongoose';
import { VisitorModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildVisitorMatch } from './analytics-query.builder.js';
import { formatAttribution } from './source-attribution.util.js';
import { parsePagination, buildPaginationMeta } from '@/utils/pagination.js';

export async function getVisitors(filter: AnalyticsFilter) {
  const { page, limit } = parsePagination({ page: filter.page, limit: filter.limit });
  const skip = (page - 1) * limit;
  const query = await buildVisitorMatch(filter);

  const [data, total] = await Promise.all([
    VisitorModel.find(query).sort({ lastSeenAt: -1 }).skip(skip).limit(limit).lean(),
    VisitorModel.countDocuments(query),
  ]);

  const userIds = [
    ...new Set(
      data
        .map((row) => (row.userId ? String(row.userId) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const users =
    userIds.length > 0
      ? await UserModel.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
          .select('email firstName lastName')
          .lean()
      : [];

  const userById = new Map(
    users.map((user) => [
      String(user._id),
      {
        email: user.email as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
      },
    ]),
  );

  const enriched = data.map((row) => {
    const user = row.userId ? userById.get(String(row.userId)) : undefined;
    const firstName = user?.firstName?.trim() ?? '';
    const lastName = user?.lastName?.trim() ?? '';
    const normalizedLast =
      lastName && lastName.toLowerCase() !== firstName.toLowerCase() ? lastName : '';
    const customerName =
      firstName || normalizedLast
        ? [firstName, normalizedLast].filter(Boolean).join(' ')
        : (user?.email ?? null);

    const attribution = formatAttribution({
      trafficSource: row.trafficSource,
      referrer: row.referrer,
      utmSource: row.utmSource,
      utmMedium: row.utmMedium,
      utmCampaign: row.utmCampaign,
    });

    return {
      ...row,
      customerName,
      customerEmail: user?.email ?? null,
      sourceLabel: attribution.label,
      sourceChannel: attribution.channel,
      sourceDetail: attribution.detail ?? null,
    };
  });

  return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
}
