import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function AnalyticsChartCard({ title, description, children, actions }: Props) {
  return (
    <div className="bg-card border-border rounded-xl border">
      <div className="flex items-start justify-between gap-4 border-b border-inherit px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
