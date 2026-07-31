import { EventModel } from '@/models/analytics/index.js';
import { UserModel } from '@/models/user.model.js';
import { humanizeActivityLabel } from './activity-labels.util.js';

export interface ActivityFeedItem {
  id: string;
  at: string;
  name: string;
  label: string;
  userName?: string | null;
  productName?: string | null;
  path?: string | null;
  sessionId?: string | null;
}

const FEED_NAMES = [
  'product_viewed',
  'product_detail_opened',
  'add_to_cart',
  'add_to_wishlist',
  'checkout_started',
  'checkout_abandoned',
  'payment_completed',
  'payment_failed',
  'signup',
  'login',
  'order_delivered',
  'order_updated',
  'search',
];

export async function getActivityFeed(limit = 50): Promise<ActivityFeedItem[]> {
  const events = await EventModel.find({ name: { $in: FEED_NAMES } })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .lean();

  const userIds = [
    ...new Set(events.map((e) => (e.userId ? String(e.userId) : null)).filter(Boolean)),
  ] as string[];
  const users = userIds.length
    ? await UserModel.find({ _id: { $in: userIds } })
        .select('firstName lastName email')
        .lean()
    : [];
  const userMap = new Map(
    users.map((u) => [
      String(u._id),
      [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Customer',
    ]),
  );

  return events.map((e) => {
    const productName = (e.properties?.productName as string) || null;
    const userName = e.userId ? (userMap.get(String(e.userId)) ?? null) : null;
    return {
      id: e.eventId,
      at: e.occurredAt.toISOString(),
      name: e.name,
      label: humanizeActivityLabel(e.name, {
        userName,
        productName,
        query: (e.properties?.query as string) || null,
      }),
      userName,
      productName,
      path: e.path ?? null,
      sessionId: e.sessionId ?? null,
    };
  });
}

export { FEED_NAMES };
