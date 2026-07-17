import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, className }: StatCardProps) {
  return (
    <article
      className={cn(
        'border-border/70 bg-card/90 rounded-[1.5rem] border p-5 shadow-[var(--shadow-soft)] backdrop-blur transition-transform duration-200 hover:-translate-y-1',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
            {title}
          </p>
          <p className="font-display mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {description ? <p className="text-muted-foreground mt-1 text-xs">{description}</p> : null}
        </div>
        {Icon ? (
          <div className="bg-muted text-foreground rounded-2xl p-2.5">
            <Icon className="size-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </article>
  );
}
