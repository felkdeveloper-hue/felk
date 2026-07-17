import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/orders/order-status-badge';
import type { Order } from '@/services/sdk';
import { formatCurrency, formatDate } from '@/utils/format';

export interface OrderListItemProps {
  order: Order;
  index?: number;
}

export function OrderListItem({ order, index = 0 }: OrderListItemProps) {
  const preview = order.items[0];
  const itemCount =
    order.totals.totalQuantity ?? order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to="/account/orders/$orderId"
        params={{ orderId: order.id }}
        className="border-border bg-card hover:border-primary/40 flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {preview?.thumbnailUrl ? (
            <img
              src={preview.thumbnailUrl}
              alt=""
              className="border-border size-16 rounded-lg border object-cover"
            />
          ) : (
            <div className="border-border bg-muted size-16 rounded-lg border" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{order.orderNumber}</p>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {order.placedAt || order.createdAt
                ? formatDate(order.placedAt ?? order.createdAt!)
                : '—'}{' '}
              · {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
            {preview ? (
              <p className="text-muted-foreground mt-1 truncate text-sm">
                {preview.name}
                {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <p className="text-lg font-semibold">
            {formatCurrency(order.totals.grandTotal, order.currency)}
          </p>
          <ChevronRight className="text-muted-foreground size-5" aria-hidden />
        </div>
      </Link>
    </motion.li>
  );
}
