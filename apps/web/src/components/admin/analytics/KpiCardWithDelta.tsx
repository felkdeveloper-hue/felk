import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { KpiMetric } from '@/services/sdk/admin';

interface Props {
  title: string;
  metric: KpiMetric;
  format?: (v: number) => string;
  hint?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

export function KpiCardWithDelta({ title, metric, format, hint }: Props) {
  const display = format ? format(metric.value) : metric.value.toLocaleString();
  const pct = metric.pctChange;
  const isPositive = pct > 0;
  const isNeutral = pct === 0;

  return (
    <div className="bg-card border-border rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{display}</p>
      {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      <div className="mt-2 flex items-center gap-1">
        {isNeutral ? (
          <Minus className="text-muted-foreground h-3.5 w-3.5" />
        ) : isPositive ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span
          className={`text-xs font-medium ${
            isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-500' : 'text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}
          {pct}%
        </span>
        <span className="text-muted-foreground text-xs">vs prev period</span>
      </div>
    </div>
  );
}

export { formatDuration };
