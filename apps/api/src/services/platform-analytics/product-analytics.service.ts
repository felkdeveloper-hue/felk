import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';

const VIEW_NAMES = ['product_viewed', 'product_detail_opened'];
const CLICK_NAMES = ['product_card_clicked', 'product_image_clicked', 'product_quick_view'];
const CART_NAMES = ['add_to_cart'];
const WISHLIST_NAMES = ['add_to_wishlist'];
const PURCHASE_NAMES = ['payment_completed'];

interface ProductAggRow {
  productId: string;
  productName: string;
  count: number;
}

async function topByNames(
  filter: AnalyticsFilter,
  names: string[],
  limit = 20,
): Promise<ProductAggRow[]> {
  const base = await buildEventMatch(filter);
  delete base['name'];
  const rows = await EventModel.aggregate<{
    _id: string;
    productName: string;
    count: number;
  }>([
    {
      $match: mergeMatch(base, {
        name: { $in: names },
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
    { $limit: limit },
  ]);

  return rows.map((r) => ({
    productId: String(r._id),
    productName: (r.productName as string) || String(r._id),
    count: r.count,
  }));
}

export async function getProductAnalytics(filter: AnalyticsFilter) {
  const [mostViewed, mostClicked, mostAddedToCart, mostWishlisted, conversion] = await Promise.all([
    topByNames(filter, VIEW_NAMES),
    topByNames(filter, CLICK_NAMES),
    topByNames(filter, CART_NAMES),
    topByNames(filter, WISHLIST_NAMES),
    getConversionProducts(filter),
  ]);

  return { mostViewed, mostClicked, mostAddedToCart, mostWishlisted, conversion };
}

async function getConversionProducts(filter: AnalyticsFilter, limit = 20) {
  const base = await buildEventMatch(filter);
  delete base['name'];
  const rows = await EventModel.aggregate<{
    _id: string;
    productName: string;
    views: number;
    carts: number;
    purchases: number;
  }>([
    {
      $match: mergeMatch(base, {
        name: { $in: [...VIEW_NAMES, ...CART_NAMES, ...PURCHASE_NAMES] },
      }),
    },
    {
      $group: {
        _id: {
          productId: '$properties.productId',
          name: '$name',
        },
        productName: { $last: '$properties.productName' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.productId',
        productName: { $last: '$productName' },
        views: {
          $sum: {
            $cond: [{ $in: ['$_id.name', VIEW_NAMES] }, '$count', 0],
          },
        },
        carts: {
          $sum: {
            $cond: [{ $in: ['$_id.name', CART_NAMES] }, '$count', 0],
          },
        },
        purchases: {
          $sum: {
            $cond: [{ $in: ['$_id.name', PURCHASE_NAMES] }, '$count', 0],
          },
        },
      },
    },
    { $match: { _id: { $nin: [null, ''] }, views: { $gt: 0 } } },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ['$views', 0] },
            { $multiply: [{ $divide: ['$purchases', '$views'] }, 100] },
            0,
          ],
        },
        cartRate: {
          $cond: [
            { $gt: ['$views', 0] },
            { $multiply: [{ $divide: ['$carts', '$views'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { conversionRate: -1 as const, views: -1 as const } },
    { $limit: limit },
  ]);

  return rows.map((r) => ({
    productId: String(r._id),
    productName: (r.productName as string) || String(r._id),
    views: r.views,
    carts: r.carts,
    purchases: r.purchases,
    cartRate: Math.round(((r as { cartRate?: number }).cartRate ?? 0) * 10) / 10,
    conversionRate: Math.round(((r as { conversionRate?: number }).conversionRate ?? 0) * 10) / 10,
  }));
}

export async function getProductInterest(productId: string, filter: AnalyticsFilter) {
  const base = await buildEventMatch({ ...filter, productId });
  delete base['name'];
  const counts = await EventModel.aggregate<{ _id: string; count: number }>([
    {
      $match: mergeMatch(base, {
        name: {
          $in: [...VIEW_NAMES, ...CLICK_NAMES, ...CART_NAMES, ...WISHLIST_NAMES, ...PURCHASE_NAMES],
        },
      }),
    },
    { $group: { _id: '$name', count: { $sum: 1 } } },
  ]);

  const byName = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const nameDoc = await EventModel.findOne({ 'properties.productId': productId })
    .sort({ occurredAt: -1 })
    .select('properties.productName')
    .lean();

  const views = (byName.product_viewed ?? 0) + (byName.product_detail_opened ?? 0);
  const clicks =
    (byName.product_card_clicked ?? 0) +
    (byName.product_image_clicked ?? 0) +
    (byName.product_quick_view ?? 0);

  return {
    productId,
    productName: (nameDoc?.properties?.productName as string) || productId,
    views,
    clicks,
    wishlistAdds: byName.add_to_wishlist ?? 0,
    cartAdds: byName.add_to_cart ?? 0,
    purchases: byName.payment_completed ?? 0,
  };
}
