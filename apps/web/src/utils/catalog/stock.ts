import type { Product } from '@/services/sdk/products';

/** Units at or below this count as "low in stock" (never for sold-out). */
export const LOW_STOCK_THRESHOLD = 5;

/** Sum tracked variant stock; undefined when inventory is not tracked. */
export function getTrackedStockTotal(product: Product): number | undefined {
  const tracked = product.variants?.filter((v) => typeof v.stock === 'number') ?? [];
  if (!tracked.length) return undefined;
  return tracked.reduce((sum, v) => sum + Math.max(0, v.stock ?? 0), 0);
}

export function isProductSoldOut(product: Product): boolean {
  return product.inStock === false || product.status === 'out_of_stock';
}

/**
 * Low stock urgency badge — only when some stock remains and it is scarce.
 * Never true for out-of-stock / sold-out products.
 */
export function isProductLowStock(product: Product): boolean {
  if (isProductSoldOut(product)) return false;
  const total = getTrackedStockTotal(product);
  if (total == null) return false;
  return total > 0 && total <= LOW_STOCK_THRESHOLD;
}
