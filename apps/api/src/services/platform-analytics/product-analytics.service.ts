import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';
import { attachProductImages, productImagesById } from './product-images.util.js';
import { pickSizeLabel, sizeNameByVariantId, toSizeCounts } from './size-breakdown.util.js';

const VIEW_NAMES = ['product_viewed', 'product_detail_opened'];
const CLICK_NAMES = ['product_card_clicked', 'product_image_clicked', 'product_quick_view'];
const CART_NAMES = ['add_to_cart'];
const WISHLIST_NAMES = ['add_to_wishlist'];
const PURCHASE_NAMES = ['payment_completed'];

interface ProductAggRow {
  productId: string;
  productName: string;
  count: number;
  sizes?: Array<{ size: string; count: number }>;
}

async function topByNames(
  filter: AnalyticsFilter,
  names: string[],
  limit = 200,
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

async function topCartWithSizes(filter: AnalyticsFilter, limit = 200): Promise<ProductAggRow[]> {
  const base = await buildEventMatch(filter);
  delete base['name'];
  const rows = await EventModel.aggregate<{
    _id: { productId: string; variantId: string; sizeName: string };
    productName: string;
    variantLabel: string;
    count: number;
  }>([
    {
      $match: mergeMatch(base, {
        name: { $in: CART_NAMES },
        'properties.productId': { $exists: true, $nin: [null, ''] },
      }),
    },
    {
      $group: {
        _id: {
          productId: '$properties.productId',
          variantId: { $ifNull: ['$properties.variantId', ''] },
          sizeName: { $ifNull: ['$properties.sizeName', ''] },
        },
        productName: { $last: '$properties.productName' },
        variantLabel: { $last: '$properties.variantLabel' },
        count: {
          $sum: {
            $cond: [{ $gt: ['$properties.quantity', 0] }, '$properties.quantity', 1],
          },
        },
      },
    },
  ]);

  const sizeByVariant = await sizeNameByVariantId(
    rows.map((row) => String(row._id.variantId ?? '')),
  );
  const products = new Map<
    string,
    { productId: string; productName: string; count: number; sizes: Map<string, number> }
  >();

  for (const row of rows) {
    const productId = String(row._id.productId);
    const size = pickSizeLabel({
      sizeName: row._id.sizeName,
      variantId: row._id.variantId,
      variantLabel: row.variantLabel,
      sizeByVariant,
    });
    const current = products.get(productId) ?? {
      productId,
      productName: row.productName || productId,
      count: 0,
      sizes: new Map<string, number>(),
    };
    current.productName = row.productName || current.productName;
    current.count += row.count;
    current.sizes.set(size, (current.sizes.get(size) ?? 0) + row.count);
    products.set(productId, current);
  }

  return [...products.values()]
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      count: product.count,
      sizes: toSizeCounts(product.sizes),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getProductAnalytics(filter: AnalyticsFilter) {
  const [mostViewed, mostClicked, mostAddedToCart, mostWishlisted, conversion] = await Promise.all([
    topByNames(filter, VIEW_NAMES),
    topByNames(filter, CLICK_NAMES),
    topCartWithSizes(filter),
    topByNames(filter, WISHLIST_NAMES),
    getConversionProducts(filter),
  ]);

  const imageById = await productImagesById(
    [...mostViewed, ...mostClicked, ...mostAddedToCart, ...mostWishlisted, ...conversion].map(
      (row) => row.productId,
    ),
  );

  return {
    mostViewed: await attachProductImages(mostViewed, imageById),
    mostClicked: await attachProductImages(mostClicked, imageById),
    mostAddedToCart: await attachProductImages(mostAddedToCart, imageById),
    mostWishlisted: await attachProductImages(mostWishlisted, imageById),
    conversion: await attachProductImages(conversion, imageById),
  };
}

async function getConversionProducts(filter: AnalyticsFilter, limit = 200) {
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
