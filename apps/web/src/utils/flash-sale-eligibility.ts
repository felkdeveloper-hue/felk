import type { Category } from '@/services/sdk/categories';
import type { CartLineItem } from '@/services/sdk/cart';
import type { Product } from '@/services/sdk/products';

/** Category slugs excluded from the extra 20% member flash sale. */
export const FLASH_SALE_EXCLUDED_CATEGORY_SLUGS = ['shoes'] as const;

export type FlashSaleCategoryRef = {
  categoryId?: string;
  categoryIds?: string[];
  subcategoryId?: string;
};

export function collectProductCategoryIds(ref: FlashSaleCategoryRef): string[] {
  const ids = new Set<string>();
  if (ref.categoryId) ids.add(ref.categoryId);
  if (ref.subcategoryId) ids.add(ref.subcategoryId);
  ref.categoryIds?.forEach((id) => ids.add(id));
  return [...ids];
}

export function buildCategorySlugLookup(categories: Category[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of categories) {
    map.set(category.id, category.slug.trim().toLowerCase());
  }
  return map;
}

export function isFlashSaleEligibleForCategories(
  ref: FlashSaleCategoryRef,
  slugByCategoryId: Map<string, string>,
): boolean {
  if (!slugByCategoryId.size) return true;

  for (const id of collectProductCategoryIds(ref)) {
    const slug = slugByCategoryId.get(id);
    if (
      slug &&
      (FLASH_SALE_EXCLUDED_CATEGORY_SLUGS as readonly string[]).includes(slug)
    ) {
      return false;
    }
  }

  return true;
}

export function isProductFlashSaleEligible(
  product: Product,
  slugByCategoryId: Map<string, string>,
): boolean {
  return isFlashSaleEligibleForCategories(product, slugByCategoryId);
}

export function applyFlashDiscount(amount: number, eligible: boolean): number {
  if (!eligible) return amount;
  return Math.round(amount * 0.8);
}

export function computeFlashAdjustedSubtotal(
  items: Array<Pick<CartLineItem, 'totalPrice' | 'categoryId' | 'categoryIds' | 'subcategoryId'>>,
  slugByCategoryId: Map<string, string>,
): number {
  return items.reduce((sum, item) => {
    const eligible = isFlashSaleEligibleForCategories(item, slugByCategoryId);
    return sum + applyFlashDiscount(item.totalPrice, eligible);
  }, 0);
}

export function computeFlashSaving(
  items: Array<Pick<CartLineItem, 'totalPrice' | 'categoryId' | 'categoryIds' | 'subcategoryId'>>,
  slugByCategoryId: Map<string, string>,
): number {
  const original = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return original - computeFlashAdjustedSubtotal(items, slugByCategoryId);
}
