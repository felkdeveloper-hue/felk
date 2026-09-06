import type { SizeCount } from '@/services/sdk/admin';

export function formatSizeBreakdown(sizes?: SizeCount[]): string {
  if (!sizes?.length) return '';
  return sizes.map((row) => `${row.size} ${row.count}`).join(' · ');
}

/** Compact chips: "Small 3 · Large 2" */
export function SizeBreakdown({
  sizes,
  empty = '—',
}: {
  sizes?: SizeCount[];
  empty?: string;
}) {
  if (!sizes?.length) {
    return <span className="text-muted-foreground">{empty}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((row) => (
        <span
          key={`${row.size}-${row.count}`}
          className="bg-muted text-foreground inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 text-xs"
        >
          <span className="font-medium">{row.size}</span>
          <span className="text-muted-foreground tabular-nums">{row.count}</span>
        </span>
      ))}
    </div>
  );
}
