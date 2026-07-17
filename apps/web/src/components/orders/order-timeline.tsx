import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ORDER_TERMINAL_STEPS, ORDER_TIMELINE_STEPS } from '@/constants/order.constants';
import type { Order, OrderTimelineEntry } from '@/services/sdk';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';

export interface OrderTimelineProps {
  order: Order;
  timeline?: OrderTimelineEntry[];
}

function getStepTimestamp(order: Order, field: keyof Order): string | undefined {
  const value = order[field];
  return typeof value === 'string' ? value : undefined;
}

function statusRank(status: string): number {
  const index = ORDER_TIMELINE_STEPS.findIndex((step) => step.status === status);
  return index >= 0 ? index : -1;
}

export function OrderTimeline({ order, timeline = [] }: OrderTimelineProps) {
  const isTerminal = ['cancelled', 'returned', 'refund_pending', 'refunded'].includes(order.status);
  const steps = isTerminal
    ? ORDER_TERMINAL_STEPS.filter((step) => step.status === order.status)
    : ORDER_TIMELINE_STEPS;

  const currentRank = statusRank(order.status);

  return (
    <ol className="space-y-0" aria-label="Order timeline">
      {steps.map((step, index) => {
        const timestamp = getStepTimestamp(order, step.timestampField);
        const rank = statusRank(step.status);
        const isComplete = isTerminal
          ? step.status === order.status
          : rank >= 0 && rank <= currentRank;
        const isCurrent = order.status === step.status;
        const timelineNote = timeline.find((entry) => entry.status === step.status)?.note;

        return (
          <motion.li
            key={step.status}
            className="relative flex gap-4 pb-8 last:pb-0"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px',
                  isComplete ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden
              />
            ) : null}

            <div
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2',
                isComplete
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background',
                isCurrent && 'ring-primary/20 ring-2',
              )}
              aria-hidden
            >
              {isComplete ? (
                <Check className="size-4" />
              ) : (
                <span className="bg-muted-foreground/40 size-2 rounded-full" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('font-medium', isCurrent && 'text-primary')}>{step.label}</p>
              {timestamp ? (
                <p className="text-muted-foreground mt-1 text-sm">{formatDate(timestamp)}</p>
              ) : null}
              {timelineNote ? (
                <p className="text-muted-foreground mt-1 text-sm">{timelineNote}</p>
              ) : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
