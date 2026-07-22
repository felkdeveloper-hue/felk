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
}

function resolveColorImage(
  colorId: string,
  variants: ProductVariant[],
  media: ProductMedia[],
): string | undefined {
  const colorVariants = variants.filter((v) => v.colorId === colorId);
  for (const variant of colorVariants) {
    if (variant.thumbnailUrl) return variant.thumbnailUrl;
  }
  const variantIds = new Set(colorVariants.map((v) => v.id));
  const matched = media.find(
    (item) => item.variantId && variantIds.has(item.variantId) && item.url,
  );
  if (matched?.url) return matched.url;
  // Do not fall back to shared product photos — those may be another color.
  return undefined;
}

export function ProductColorSelector({
  variants,
  media = [],
  selectedColorId,
  onColorSelect,
  colorLabels = {},
  productName = 'Product',
}: ProductColorSelectorProps) {
  const colors = [...new Set(variants.map((v) => v.colorId).filter(Boolean))] as string[];
  if (!colors.length) return null;

  const activeLabel =
    (selectedColorId && colorLabels[selectedColorId]) ||
    (selectedColorId
      ? variants.find((v) => v.colorId === selectedColorId)?.optionValues?.color
      : undefined) ||
    (selectedColorId ? colorLabels[selectedColorId] : undefined);

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
          const active = selectedColorId === colorId;
          const label =
            colorLabels[colorId] ??
            variants.find((v) => v.colorId === colorId)?.optionValues?.color ??
            'Color';
          const imageUrl = resolveColorImage(colorId, variants, media);

          return (
            <button
              key={colorId}
              type="button"
              aria-label={label}
              aria-pressed={active}
              title={label}
              onClick={() => onColorSelect(colorId)}
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
