import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';

const STAGES = [
  { key: 'viewed', label: 'Viewed Product', names: ['product_viewed', 'product_detail_opened'] },
  {
    key: 'clicked',
    label: 'Clicked Product',
    names: ['product_card_clicked', 'product_image_clicked', 'product_quick_view'],
  },
  { key: 'wishlist', label: 'Wishlist', names: ['add_to_wishlist'] },
  { key: 'cart', label: 'Add To Cart', names: ['add_to_cart'] },
  { key: 'checkout', label: 'Checkout', names: ['checkout_started'] },
  { key: 'payment', label: 'Payment', names: ['payment_completed'] },
  { key: 'delivered', label: 'Delivered', names: ['order_delivered'] },
] as const;

export async function getProductFunnel(filter: AnalyticsFilter) {
  const base = await buildEventMatch(filter);
  delete base['name'];
  const match = mergeMatch(base, {
    name: { $in: STAGES.flatMap((s) => [...s.names]) },
  });

  const counts = await EventModel.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: '$name', count: { $sum: 1 } } },
  ]);
  const byName = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  const stages = STAGES.map((stage, index) => {
    const count = stage.names.reduce((sum, n) => sum + (byName[n] ?? 0), 0);
    const prevCount =
      index === 0 ? count : STAGES[index - 1]!.names.reduce((sum, n) => sum + (byName[n] ?? 0), 0);
    const dropOffPct =
      index === 0 || prevCount === 0 ? 0 : Math.round((1 - count / prevCount) * 1000) / 10;
    return {
      key: stage.key,
      label: stage.label,
      count,
      dropOffPct,
      conversionFromTop: 0,
    };
  });

  const top = stages[0]?.count ?? 0;
  return {
    stages: stages.map((s) => ({
      ...s,
      conversionFromTop: top > 0 ? Math.round((s.count / top) * 1000) / 10 : 0,
    })),
    filters: {
      productId: filter.productId ?? null,
      category: filter.category ?? null,
      brandId: filter.brandId ?? null,
    },
  };
}
