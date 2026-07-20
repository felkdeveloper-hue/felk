import { Link2, Hand, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeProductSpec, type ProductSpec } from '@/utils/catalog/specifications';

const HIGHLIGHT_ICONS = [Link2, Hand, Flower2] as const;

export interface ProductHighlightsProps {
  specifications?: unknown[];
  className?: string;
}

export function ProductHighlights({ specifications = [], className }: ProductHighlightsProps) {
  const highlights = specifications
    .map(normalizeProductSpec)
    .filter((item): item is ProductSpec => Boolean(item))
    .slice(0, 3);

  if (!highlights.length) return null;

  return (
    <section aria-labelledby="key-highlights" className={cn('space-y-3', className)}>
      <h2 id="key-highlights" className="text-sm font-semibold">
        Key Highlights
      </h2>
      <div className="grid grid-cols-3 gap-2 rounded-xl border p-4">
        {highlights.map((item, index) => {
          const Icon = HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length] ?? Link2;
          return (
            <div
              key={`${item.label}-${index}`}
              className="flex flex-col items-center gap-2 text-center"
            >
              <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                <Icon className="text-muted-foreground size-5" />
              </div>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs">
                {item.value ? `${item.label}: ${item.value}` : item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
