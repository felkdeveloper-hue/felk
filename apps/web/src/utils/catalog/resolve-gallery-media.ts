import type { ProductMedia, ProductVariant } from '@/services/sdk';

/**
 * Gallery for the selected color / variant.
 * Prefer color-specific photos; fall back to uncolored + product-level media
 * instead of returning an empty gallery when another color has images.
 */
export function resolveProductGalleryMedia(
  media: ProductMedia[],
  variants: ProductVariant[] | undefined,
  selectedColorId?: string,
  selectedVariantId?: string,
): ProductMedia[] {
  if (!media.length) return media;

  const withUrl = media.filter((item) => item.url);
  const productLevel = withUrl.filter((item) => !item.variantId);
  const uncoloredVariantIds = new Set(
    (variants ?? []).filter((variant) => !variant.colorId).map((variant) => variant.id),
  );
  const uncoloredMedia = withUrl.filter(
    (item) => item.variantId && uncoloredVariantIds.has(item.variantId),
  );
  const shared = [...productLevel, ...uncoloredMedia];

  if (selectedColorId && variants?.length) {
    const colorVariantIds = new Set(
      variants
        .filter((variant) => variant.colorId === selectedColorId)
        .map((variant) => variant.id),
    );
    const colorMedia = withUrl.filter(
      (item) => item.variantId && colorVariantIds.has(item.variantId),
    );
    if (colorMedia.length) return colorMedia;
    // Selected color has no dedicated photos — show shared / default images.
    if (shared.length) return shared;
  }

  if (selectedVariantId) {
    const forVariant = withUrl.filter((item) => item.variantId === selectedVariantId);
    if (forVariant.length) return forVariant;
  }

  if (shared.length) return shared;
  return productLevel.length ? productLevel : withUrl.filter((item) => !item.variantId);
}
