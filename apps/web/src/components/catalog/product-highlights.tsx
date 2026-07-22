import { Link2, Hand, Flower2, Shirt, Sparkles, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeProductSpec, type ProductSpec } from '@/utils/catalog/specifications';

const HIGHLIGHT_ICONS = [Link2, Hand, Flower2, Shirt, Sparkles, Droplets] as const;

export interface ProductHighlightsProps {
  specifications?: unknown[] | ProductSpec[];
  className?: string;
}

export function ProductHighlights({ specifications = [], className }: ProductHighlightsProps) {
  const highlights = specifications
    .map((item) => {
      if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
        const row = item as ProductSpec;
        if (row.label && row.value) return row;
      }
      return normalizeProductSpec(item);
    })
    .filter((item): item is ProductSpec => Boolean(item))
    .slice(0, 3);

  if (!highlights.length) return null;

  return (
    <section aria-labelledby="key-highlights" className={cn('space-y-3', className)}>
      <h2 id="key-highlights" className="text-sm font-semibold tracking-wide">
        Key Highlights
      </h2>
      <div className="border-border/70 bg-muted/20 grid grid-cols-3 gap-3 rounded-2xl border p-4 sm:gap-4 sm:p-5">
        {highlights.map((item, index) => {
          const Icon = HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length] ?? Link2;
          return (
            <div
              key={`${item.label}-${index}`}
              className="flex flex-col items-center gap-2.5 text-center"
            >
              <div className="bg-background flex size-11 items-center justify-center rounded-full shadow-sm ring-1 ring-black/5">
                <Icon className="text-foreground/70 size-5" aria-hidden />
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.14em] sm:text-[11px]">
                  {item.label}
                </p>
                <p className="text-foreground text-xs font-semibold leading-snug sm:text-sm">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
