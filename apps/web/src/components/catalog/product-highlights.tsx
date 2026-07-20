import { Link2, Hand, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIGHLIGHT_ICONS = [Link2, Hand, Flower2] as const;

const DEFAULT_HIGHLIGHTS = [
  { label: 'Enhanced Durability', key: 'durability' },
  { label: 'Thick & Resilient Fabric', key: 'fabric' },
  { label: 'Premium Terry Cotton', key: 'cotton' },
];

function normalizeSpec(spec: unknown): { label: string; value?: string } | null {
  if (!spec || typeof spec !== 'object') return null;
  const record = spec as Record<string, unknown>;
  const label = String(record.label ?? record.key ?? record.name ?? '');
  const value = record.value != null ? String(record.value) : undefined;
  if (!label) return null;
  return { label, value };
}

export interface ProductHighlightsProps {
  specifications?: unknown[];
  className?: string;
}

export function ProductHighlights({ specifications = [], className }: ProductHighlightsProps) {
  const fromSpecs = specifications
    .map(normalizeSpec)
    .filter((item): item is { label: string; value?: string } => Boolean(item))
    .slice(0, 3);

  const highlights =
    fromSpecs.length >= 2
      ? fromSpecs.map((s) => ({ label: s.value ? `${s.label}: ${s.value}` : s.label }))
      : DEFAULT_HIGHLIGHTS.map((h) => ({ label: h.label }));

  return (
    <section aria-labelledby="key-highlights" className={cn('space-y-3', className)}>
      <h2 id="key-highlights" className="text-sm font-semibold">
        Key Highlights
      </h2>
      <div className="grid grid-cols-3 gap-2 rounded-xl border p-4">
        {highlights.map((item, index) => {
          const Icon = HIGHLIGHT_ICONS[index % HIGHLIGHT_ICONS.length] ?? Link2;
          return (
            <div key={index} className="flex flex-col items-center gap-2 text-center">
              <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                <Icon className="text-muted-foreground size-5" />
              </div>
              <p className="text-muted-foreground text-[11px] leading-snug sm:text-xs">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
