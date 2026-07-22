import type { ProductMedia, ProductVariant } from '@/services/sdk';

/**
 * Gallery for the selected color only.
 * Never mix another color into the left thumbnails.
 */
export function resolveProductGalleryMedia(
  media: ProductMedia[],
  variants: ProductVariant[] | undefined,
  selectedColorId?: string,
): ProductMedia[] {
  if (!media.length) return media;

  const main = media.filter((item) => !item.variantId && item.url);
  const withUrl = media.filter((item) => item.url);

  if (!selectedColorId || !variants?.length) {
    return main.length ? main : withUrl;
  }

  const colorVariantIds = new Set(
    variants.filter((v) => v.colorId === selectedColorId).map((v) => v.id),
  );
  const colorMedia = media.filter(
    (item) => item.variantId && colorVariantIds.has(item.variantId) && item.url,
  );

  if (colorMedia.length) return colorMedia;

  // Per-color photos exist for other colors — don't leak them via shared main gallery.
  const hasAnyColorMedia = media.some((item) => item.variantId && item.url);
  if (hasAnyColorMedia) return colorMedia;

  return main.length ? main : withUrl;
}
