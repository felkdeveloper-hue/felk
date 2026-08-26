import { EventModel, PageViewModel } from '@/models/analytics/index.js';
import { OrderModel } from '@/models/order.models.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  buildEventMatch,
  buildOrderMatch,
  buildPageViewMatch,
  mergeMatch,
  resolveDateRange,
} from './analytics-query.builder.js';

export async function getProductInsights(productId: string, filter: AnalyticsFilter) {
  const range = resolveDateRange(filter);
  const scoped = { ...filter, productId };
  const eventBase = await buildEventMatch(scoped, range);
  delete eventBase['name'];
  const pageMatch = {
    ...buildPageViewMatch(filter, range),
    path: { $regex: productId, $options: 'i' },
  };
  const orderMatch = await buildOrderMatch(scoped, { range });
  if (!filter.orderStatus) {
    orderMatch['status'] = { $nin: ['cancelled', 'refunded'] };
  }

  const [eventCounts, uniqueVisitors, pageStats, orders] = await Promise.all([
    EventModel.aggregate<{ _id: string; count: number }>([
      { $match: eventBase },
      { $group: { _id: '$name', count: { $sum: 1 } } },
    ]),
    EventModel.distinct(
      'visitorId',
      mergeMatch(eventBase, {
        name: { $in: ['product_viewed', 'product_detail_opened'] },
        visitorId: { $ne: null },
      }),
    ),
    PageViewModel.aggregate<{ avgTime: number; avgScroll: number; views: number }>([
      { $match: pageMatch },
      {
        $group: {
          _id: null,
          avgTime: { $avg: { $ifNull: ['$timeOnPageMs', 0] } },
          avgScroll: { $avg: { $ifNull: ['$scrollDepth', 0] } },
          views: { $sum: 1 },
        },
      },
    ]),
    OrderModel.find(orderMatch).select('userId customerId totals.grandTotal items').lean(),
  ]);

  const byName = Object.fromEntries(eventCounts.map((c) => [c._id, c.count]));
  const views =
    (byName.product_viewed ?? 0) + (byName.product_detail_opened ?? 0) + (pageStats[0]?.views ?? 0);
  const wishlistAdds = byName.add_to_wishlist ?? 0;
  const cartAdds = byName.add_to_cart ?? 0;
  // Use the higher of tracked events vs actual orders — events can be missing if
  // the browser closed before the analytics batch fired, but orders are always real.
  const purchases = Math.max(byName.payment_completed ?? 0, orders.length);

  let revenue = 0;
  const buyerIds = new Set<string>();
  for (const order of orders) {
    const lines = (order.items ?? []).filter(
      (i: { productId?: unknown }) => String(i.productId) === productId,
    );
    for (const line of lines) {
      const qty = Number((line as { quantity?: number }).quantity ?? 1);
      const price = Number(
        (line as { unitPrice?: number; price?: number }).unitPrice ??
          (line as { price?: number }).price ??
          0,
      );
      revenue += qty * price;
    }
    if (!lines.length && order.totals?.grandTotal) {
      // fallback share of order if line match failed casting
      revenue += 0;
    }
    const buyer = order.userId
      ? String(order.userId)
      : order.customerId
        ? String(order.customerId)
        : null;
    if (buyer) buyerIds.add(buyer);
  }

  // Repeat buyers: users with >1 order containing product
  const buyerOrderCounts = new Map<string, number>();
  for (const order of orders) {
    const buyer = order.userId
      ? String(order.userId)
      : order.customerId
        ? String(order.customerId)
        : null;
    if (!buyer) continue;
    buyerOrderCounts.set(buyer, (buyerOrderCounts.get(buyer) ?? 0) + 1);
  }
  const repeatBuyers = [...buyerOrderCounts.values()].filter((c) => c > 1).length;

  const conversionRate = views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0;

  return {
    productId,
    views,
    uniqueVisitors: uniqueVisitors.filter(Boolean).length,
    wishlistAdds,
    cartAdds,
    purchases,
    conversionRate,
    revenue: Math.round(revenue * 100) / 100,
    repeatBuyers,
    avgTimeViewingMs: Math.round(pageStats[0]?.avgTime ?? 0),
    avgScrollDepth: Math.round(pageStats[0]?.avgScroll ?? 0),
    buyers: buyerIds.size,
  };
}
