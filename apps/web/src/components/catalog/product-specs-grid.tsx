import { cn } from '@/lib/utils';
import { normalizeProductSpec, type ProductSpec } from '@/utils/catalog/specifications';

export interface ProductSpecsGridProps {
  specifications?: unknown[];
  className?: string;
}

export function ProductSpecsGrid({ specifications = [], className }: ProductSpecsGridProps) {
  const specs = specifications
    .map(normalizeProductSpec)
    .filter((item): item is ProductSpec => Boolean(item));

  if (!specs.length) return null;

  return (
    <div className={cn('grid grid-cols-2 gap-x-6', className)}>
      {specs.map((spec, index) => (
        <div
          key={`${spec.label}-${index}`}
          className={cn(
            'border-border/60 space-y-0.5 border-b py-3',
            index >= specs.length - 2 && 'border-b-0',
          )}
        >
          <dt className="text-muted-foreground text-xs">{spec.label}</dt>
          <dd className="text-sm font-semibold">{spec.value}</dd>
        </div>
      ))}
    </div>
  );
}
