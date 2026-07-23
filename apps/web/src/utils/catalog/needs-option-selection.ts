import type { Product, ProductVariant } from '@/services/sdk';

/**
 * True when the shopper must pick size/color/variant before add-to-cart.
 * Prefers API `requiresOptionSelection` on list cards; falls back to variants / count.
 */
export function needsOptionSelection(product: Product): boolean {
  if (typeof product.requiresOptionSelection === 'boolean') {
    return product.requiresOptionSelection;
  }

  const variants = product.variants;
  if (variants && variants.length > 0) {
    return hasMultipleSelectableOptions(variants);
  }

  const count = typeof product.variantCount === 'number' ? product.variantCount : 0;
  return count > 1;
}

function hasMultipleSelectableOptions(variants: ProductVariant[]): boolean {
  if (variants.length <= 1) return false;

  const sizeIds = new Set(variants.map((v) => v.sizeId).filter(Boolean));
  const colorIds = new Set(variants.map((v) => v.colorId).filter(Boolean));
  if (sizeIds.size > 1 || colorIds.size > 1) return true;

  // Distinct SKUs without size/color metadata still need a choice.
  return variants.length > 1;
}
