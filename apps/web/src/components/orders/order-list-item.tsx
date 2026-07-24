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
        className="border-border bg-card hover:border-primary/40 block rounded-xl border p-4 transition-colors"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          </div>

          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <p className="text-lg font-semibold">
              {formatCurrency(order.totals.grandTotal, order.currency)}
            </p>
            <ChevronRight className="text-muted-foreground size-5" aria-hidden />
          </div>
        </div>

        <ul className="border-border mt-4 space-y-3 border-t pt-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  className="border-border size-14 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <div
                  className="border-border bg-muted size-14 shrink-0 rounded-lg border"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {item.variantTitle ? (
                  <p className="text-muted-foreground truncate text-xs">{item.variantTitle}</p>
                ) : null}
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.sku ? `SKU ${item.sku} · ` : ''}Qty {item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium">
                {formatCurrency(item.lineTotal, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </Link>
    </motion.li>
  );
}
