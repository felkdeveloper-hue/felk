import { cn } from '@/lib/utils';
import { normalizeProductSpec, type ProductSpec } from '@/utils/catalog/specifications';

export interface ProductSpecsGridProps {
  specifications?: unknown[] | ProductSpec[];
  className?: string;
  title?: string;
}

export function ProductSpecsGrid({
  specifications = [],
  className,
  title = 'Product Details',
}: ProductSpecsGridProps) {
  const specs = specifications
    .map((item) => {
      if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
        const row = item as ProductSpec;
        if (row.label && row.value) return row;
      }
      return normalizeProductSpec(item);
    })
    .filter((item): item is ProductSpec => Boolean(item));

  if (!specs.length) return null;

  return (
    <section aria-labelledby="product-specs" className={cn('space-y-3', className)}>
      <h2 id="product-specs" className="text-sm font-semibold tracking-wide">
        {title}
      </h2>
      <dl className="border-border/70 overflow-hidden rounded-2xl border">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {specs.map((spec, index) => (
            <div
              key={`${spec.label}-${index}`}
              className={cn(
                'border-border/60 flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5',
                index % 2 === 0 ? 'bg-muted/15' : 'bg-background',
                'border-b sm:border-b sm:odd:border-r',
              )}
            >
              <dt className="text-muted-foreground shrink-0 text-xs font-medium">{spec.label}</dt>
              <dd className="text-right text-sm font-semibold">{spec.value}</dd>
            </div>
          ))}
        </div>
      </dl>
    </section>
  );
}
