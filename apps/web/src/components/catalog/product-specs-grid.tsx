import { cn } from '@/lib/utils';

const DEFAULT_SPECS = [
  { label: 'Design', value: 'Graphic Print' },
  { label: 'Fit', value: 'Oversized Fit' },
  { label: 'Neck', value: 'Round Neck' },
  { label: 'Occasion', value: 'Casual Wear' },
  { label: 'Sleeve Style', value: 'Half Sleeve' },
  { label: 'Wash Care', value: 'Gentle Machine Wash' },
];

function normalizeSpec(spec: unknown): { label: string; value: string } | null {
  if (!spec || typeof spec !== 'object') return null;
  const record = spec as Record<string, unknown>;
  const label = String(record.label ?? record.key ?? record.name ?? '').trim();
  const value = String(record.value ?? '').trim();
  if (!label || !value) return null;
  return { label, value };
}

export interface ProductSpecsGridProps {
  specifications?: unknown[];
  className?: string;
}

export function ProductSpecsGrid({ specifications = [], className }: ProductSpecsGridProps) {
  const parsed = specifications.map(normalizeSpec).filter(Boolean) as {
    label: string;
    value: string;
  }[];

  const specs = parsed.length >= 4 ? parsed : DEFAULT_SPECS;

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
