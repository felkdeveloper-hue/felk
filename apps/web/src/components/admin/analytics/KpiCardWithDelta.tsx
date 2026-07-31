import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { KpiMetric } from '@/services/sdk/admin';
import { cn } from '@/lib/utils';
import { DRILL_TOOLTIP } from '@/lib/analytics/drill-down';

interface Props {
  title: string;
  metric: KpiMetric;
  format?: (v: number) => string;
  hint?: string;
  /** When set, card is clickable for drill-down */
  onDrill?: () => void;
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

export function KpiCardWithDelta({ title, metric, format, hint, onDrill, className }: Props) {
  const display = format ? format(metric.value) : metric.value.toLocaleString();
  const pct = metric.pctChange;
  const isPositive = pct > 0;
  const isNeutral = pct === 0;

  const body = (
    <>
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-xs">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums sm:mt-1.5 sm:text-2xl">{display}</p>
      {hint && <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block">{hint}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:mt-2">
        {isNeutral ? (
          <Minus className="text-muted-foreground h-3.5 w-3.5" />
        ) : isPositive ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
        )}
        <span
          className={`text-[11px] font-medium sm:text-xs ${
            isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-500' : 'text-red-500'
          }`}
        >
          {isPositive ? '+' : ''}
          {pct}%
        </span>
        <span className="text-muted-foreground hidden text-xs sm:inline">vs prev</span>
      </div>
    </>
  );

  const shellClass = cn(
    'bg-card border-border rounded-xl border p-3 sm:p-4',
    onDrill &&
      'hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99]',
    className,
  );

  if (onDrill) {
    return (
      <button
        type="button"
        title={DRILL_TOOLTIP}
        aria-label={`${title}: ${DRILL_TOOLTIP}`}
        onClick={onDrill}
        className={cn(shellClass, 'w-full text-left')}
      >
        {body}
      </button>
    );
  }

  return <div className={shellClass}>{body}</div>;
}

export { formatDuration };
