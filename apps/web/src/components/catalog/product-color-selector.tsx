import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import type { ProductMedia, ProductVariant } from '@/services/sdk';

export interface ProductColorSelectorProps {
  variants: ProductVariant[];
  media?: ProductMedia[];
  selectedColorId?: string;
  onColorSelect: (colorId: string) => void;
  colorLabels?: Record<string, string>;
  productName?: string;
  /** Used when a color has no dedicated thumbnail (e.g. options drawer). */
  fallbackImageUrl?: string;
}

function resolveColorLabel(
  colorId: string,
  variants: ProductVariant[],
  colorLabels: Record<string, string>,
): string {
  if (colorId === '__no_color__') return 'Default';
  if (colorLabels[colorId]) return colorLabels[colorId];
  const colorVariants = variants.filter((variant) => variant.colorId === colorId);
  const fromOption = colorVariants.find((variant) => variant.optionValues?.color)?.optionValues
    ?.color;
  if (fromOption) return fromOption;
  for (const variant of colorVariants) {
    const title = variant.title?.trim();
    if (!title) continue;
    const beforeSlash = title.split('/')[0]?.trim();
    if (beforeSlash && beforeSlash.length <= 32) return beforeSlash;
  }
  return 'Color';
}

function resolveColorImage(
  colorId: string,
  variants: ProductVariant[],
  media: ProductMedia[],
  fallbackImageUrl?: string,
): string | undefined {
  if (colorId === '__no_color__') {
    const uncolored = variants.filter((variant) => !variant.colorId);
    for (const variant of uncolored) {
      if (variant.thumbnailUrl) return variant.thumbnailUrl;
    }
    const ids = new Set(uncolored.map((variant) => variant.id));
    const matched = media.find((item) => item.variantId && ids.has(item.variantId) && item.url);
    if (matched?.url) return matched.url;
    return (
      media.find((item) => !item.variantId && item.url)?.url ??
      fallbackImageUrl ??
      media.find((item) => item.url)?.url
    );
  }

  const colorVariants = variants.filter((v) => v.colorId === colorId);
  for (const variant of colorVariants) {
    if (variant.thumbnailUrl) return variant.thumbnailUrl;
  }
  const variantIds = new Set(colorVariants.map((v) => v.id));
  const matched = media.find(
    (item) => item.variantId && variantIds.has(item.variantId) && item.url,
  );
  if (matched?.url) return matched.url;

  // Prefer shared product / uncolored media over leaving the swatch blank.
  return (
    media.find((item) => !item.variantId && item.url)?.url ??
    media.find((item) => item.url)?.url ??
    fallbackImageUrl
  );
}

export function ProductColorSelector({
  variants,
  media = [],
  selectedColorId,
  onColorSelect,
  colorLabels = {},
  productName = 'Product',
  fallbackImageUrl,
}: ProductColorSelectorProps) {
  const coloredIds = [...new Set(variants.map((v) => v.colorId).filter(Boolean))] as string[];
  const hasUncolored = variants.some((variant) => !variant.colorId);
  // When a default (no-color) SKU coexists with colored ones, surface it as a swatch.
  const colors = hasUncolored && coloredIds.length ? ['__no_color__', ...coloredIds] : coloredIds;
  if (!colors.length) return null;

  const activeKey = selectedColorId || (hasUncolored ? '__no_color__' : undefined);
  const activeLabel = activeKey ? resolveColorLabel(activeKey, variants, colorLabels) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold uppercase tracking-[0.08em]">Color</span>
        {activeLabel ? (
          <span className="text-muted-foreground text-sm font-medium">: {activeLabel}</span>
        ) : (
          <span className="text-muted-foreground text-sm">:</span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-7">
        {colors.map((colorId) => {
          const active = activeKey === colorId;
          const label = resolveColorLabel(colorId, variants, colorLabels);
          const imageUrl = resolveColorImage(colorId, variants, media, fallbackImageUrl);

          return (
            <button
              key={colorId}
              type="button"
              aria-label={label}
              aria-pressed={active}
              title={label}
              onClick={() => onColorSelect(colorId === '__no_color__' ? '' : colorId)}
              className={cn(
                'bg-muted relative aspect-[3/4] overflow-hidden rounded-none border transition-all',
                active
                  ? 'border-foreground border-2'
                  : 'border-border/80 hover:border-foreground/40',
              )}
            >
              {imageUrl ? (
                <Image src={imageUrl} alt={`${productName} — ${label}`} aspectRatio="3/4" />
              ) : (
                <span className="text-muted-foreground flex h-full items-center justify-center px-1 text-center text-[10px] font-medium uppercase leading-tight">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
