import { cn } from '@/lib/utils';
import type { ProductVariant } from '@/services/sdk';

export interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedId?: string;
  onSelect: (variantId: string) => void;
  colorLabels?: Record<string, string>;
  sizeLabels?: Record<string, string>;
  showColors?: boolean;
  showSizes?: boolean;
}

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
  colorLabels = {},
  sizeLabels = {},
  showColors = true,
  showSizes = true,
}: VariantSelectorProps) {
  const colors = [
    ...new Set(variants.map((variant) => variant.colorId).filter(Boolean)),
  ] as string[];
  const sizes = [...new Set(variants.map((variant) => variant.sizeId).filter(Boolean))] as string[];

  return (
    <div className="space-y-5">
      {showColors && colors.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Color</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((colorId) => {
              const variant = variants.find((item) => item.colorId === colorId);
              const active = selectedId === variant?.id;
              return (
                <button
                  key={colorId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => variant && onSelect(variant.id)}
                  className={cn(
                    'rounded-none border px-4 py-2 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {colorLabels[colorId] ?? variant?.title ?? 'Color'}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {showSizes && sizes.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Select Size</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((sizeId) => {
              const variant = variants.find((item) => item.sizeId === sizeId);
              const active = selectedId === variant?.id;
              return (
                <button
                  key={sizeId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => variant && onSelect(variant.id)}
                  className={cn(
                    'min-w-12 rounded-none border px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {sizeLabels[sizeId] ?? variant?.optionValues?.size ?? 'Size'}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
