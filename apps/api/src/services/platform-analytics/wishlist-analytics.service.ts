import { EventModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';

export async function getWishlistAnalytics(filter: AnalyticsFilter) {
  const base = await buildEventMatch(filter);
  delete base['name'];

  const [mostWishlisted, daily, largest, removals] = await Promise.all([
    EventModel.aggregate<{ _id: string; productName: string; count: number }>([
      {
        $match: mergeMatch(base, {
          name: 'add_to_wishlist',
          'properties.productId': { $exists: true, $nin: [null, ''] },
        }),
      },
      {
        $group: {
          _id: '$properties.productId',
          productName: { $last: '$properties.productName' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 as const } },
      { $limit: 20 },
    ]),
    EventModel.aggregate<{ _id: string; adds: number; removals: number }>([
      {
        $match: mergeMatch(base, {
          name: { $in: ['add_to_wishlist', 'remove_from_wishlist'] },
        }),
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
            name: '$name',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.day',
          adds: {
            $sum: { $cond: [{ $eq: ['$_id.name', 'add_to_wishlist'] }, '$count', 0] },
          },
          removals: {
            $sum: { $cond: [{ $eq: ['$_id.name', 'remove_from_wishlist'] }, '$count', 0] },
          },
        },
      },
      { $sort: { _id: 1 as const } },
    ]),
    EventModel.aggregate<{ _id: unknown; count: number }>([
      {
        $match: mergeMatch(base, {
          name: 'add_to_wishlist',
          userId: { $ne: null },
        }),
      },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
      { $limit: 15 },
    ]),
    EventModel.countDocuments(mergeMatch(base, { name: 'remove_from_wishlist' })),
  ]);

  const userIds = largest.map((r) => r._id).filter(Boolean);
  const users = userIds.length
    ? await UserModel.find({ _id: { $in: userIds } })
        .select('email firstName lastName')
        .lean()
    : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return {
    mostWishlisted: mostWishlisted.map((r) => ({
      productId: String(r._id),
      productName: (r.productName as string) || String(r._id),
      count: r.count,
    })),
    daily: daily.map((d) => ({
      date: d._id,
      adds: d.adds,
      removals: d.removals,
    })),
    removals,
    largestWishlists: largest.map((r) => {
      const u = userMap.get(String(r._id));
      return {
        userId: String(r._id),
        email: u?.email ?? null,
        name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || null,
        count: r.count,
      };
    }),
  };
}
