import { Bell, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui-store';
import type { ProductVariant } from '@/services/sdk';

export interface ProductSizeSelectorProps {
  variants: ProductVariant[];
  selectedColorId?: string;
  selectedSizeId?: string;
  onSizeSelect: (sizeId: string) => void;
  sizeLabels?: Record<string, string>;
}

function isSizeOutOfStock(variants: ProductVariant[], sizeId: string, colorId?: string): boolean {
  const matching = variants.filter((v) => v.sizeId === sizeId);
  const relevant = colorId ? matching.filter((v) => v.colorId === colorId) : matching;
  if (!relevant.length) return true;
  return relevant.every((v) => (v.stock ?? 1) <= 0 || v.status === 'out_of_stock');
}

function resolveSizeLabel(
  sizeId: string,
  variants: ProductVariant[],
  sizeLabels: Record<string, string>,
): string {
  if (sizeLabels[sizeId]) return sizeLabels[sizeId];
  const variant = variants.find((v) => v.sizeId === sizeId);
  return variant?.optionValues?.size ?? sizeId;
}

export function ProductSizeSelector({
  variants,
  selectedColorId,
  selectedSizeId,
  onSizeSelect,
  sizeLabels = {},
}: ProductSizeSelectorProps) {
  const openModal = useUiStore((state) => state.openModal);

  const sizes = [...new Set(variants.map((v) => v.sizeId).filter(Boolean))] as string[];

  if (!sizes.length) return null;

  const activeLabel = selectedSizeId
    ? resolveSizeLabel(selectedSizeId, variants, sizeLabels)
    : undefined;

  const handleNotify = () => {
    toast.success('We will notify you when this size is back in stock.');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.08em]">Size</span>
          {activeLabel ? (
            <span className="text-muted-foreground text-sm font-medium">: {activeLabel}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => openModal('size-guide')}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <Ruler className="size-3.5" aria-hidden />
          Sizing guide
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {sizes.map((sizeId) => {
          const oos = isSizeOutOfStock(variants, sizeId, selectedColorId);
          const active = selectedSizeId === sizeId;
          const label = resolveSizeLabel(sizeId, variants, sizeLabels);

          return (
            <button
              key={sizeId}
              type="button"
              disabled={oos}
              aria-pressed={active}
              onClick={() => !oos && onSizeSelect(sizeId)}
              className={cn(
                'relative min-w-[3.25rem] rounded-none border px-3.5 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors',
                oos
                  ? 'text-muted-foreground/50 border-border bg-muted/30 cursor-not-allowed'
                  : active
                    ? 'border-foreground text-foreground border-2'
                    : 'border-border hover:border-foreground/50',
              )}
            >
              {label}
              {oos ? (
                <span
                  className="absolute inset-0 rounded-none"
                  style={{
                    background:
                      'linear-gradient(to top left, transparent calc(50% - 0.5px), hsl(var(--muted-foreground) / 0.35) calc(50% - 0.5px), hsl(var(--muted-foreground) / 0.35) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
                  }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleNotify}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <span>Size not available?</span>
        <Bell className="size-3.5" />
        Notify me
      </button>
    </div>
  );
}
