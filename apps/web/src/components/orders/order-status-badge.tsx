import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  RETURN_STATUS_CONFIG,
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
} from '@/constants/order.constants';
import { cn } from '@/lib/utils';

export interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status] ?? { label: status, badgeVariant: 'outline' as const };

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <Badge variant={config.badgeVariant} className={cn('capitalize', className)}>
        {config.label}
      </Badge>
    </motion.div>
  );
}

export interface PaymentStatusBadgeProps {
  status: string;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const config = PAYMENT_STATUS_CONFIG[status] ?? {
    label: status,
    badgeVariant: 'outline' as const,
  };

  return (
    <Badge variant={config.badgeVariant} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  );
}

export interface ReturnStatusBadgeProps {
  status: string;
}

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  const config = RETURN_STATUS_CONFIG[status] ?? {
    label: status.replace('_', ' '),
    badgeVariant: 'outline' as const,
  };

  return <Badge variant={config.badgeVariant}>{config.label}</Badge>;
}
