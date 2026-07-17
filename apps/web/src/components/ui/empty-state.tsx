import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
      {...props}
    >
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-foreground text-lg">{title}</p>
        {description ? (
          <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
