import type { Order, OrderStatus } from '@/services/sdk';

export interface OrderStatusConfig {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const ORDER_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  pending: { label: 'Pending', badgeVariant: 'secondary' },
  confirmed: { label: 'Confirmed', badgeVariant: 'default' },
  packed: { label: 'Packed', badgeVariant: 'default' },
  ready_for_shipment: { label: 'Ready for shipment', badgeVariant: 'default' },
  shipped: { label: 'Shipped', badgeVariant: 'default' },
  delivered: { label: 'Delivered', badgeVariant: 'default' },
  completed: { label: 'Completed', badgeVariant: 'default' },
  cancelled: { label: 'Cancelled', badgeVariant: 'destructive' },
  returned: { label: 'Returned', badgeVariant: 'outline' },
  refund_pending: { label: 'Refund pending', badgeVariant: 'secondary' },
  refunded: { label: 'Refunded', badgeVariant: 'outline' },
};

/** Preview of the automated customer email for each status (mirrors API templates). */
export const ORDER_STATUS_EMAIL_PREVIEW: Record<string, string> = {
  confirmed:
    'Congratulations — your order is confirmed! We’ve confirmed your order and our team is getting your items ready.',
  packed: 'Great news — your order has been carefully packed and is waiting for carrier pickup.',
  ready_for_shipment: 'Your order is ready for shipment and will leave our warehouse shortly.',
  shipped:
    'Congratulations — your order has been shipped out for delivery and is heading to your address.',
  delivered: 'Congratulations — your order has been delivered. We hope you love your new pieces!',
  completed: 'Thank you again for shopping with Fashion Edge. Your order is now complete.',
  cancelled:
    'Your order has been cancelled. If this was unexpected, please contact our support team.',
  returned:
    'We’ve started the return process for your order. Our team will be in touch with next steps.',
  refund_pending:
    'Good news — your refund is now being processed. We’re working to get it back to you soon.',
  refunded: 'We’ve issued a refund for your order. The amount should appear in your account soon.',
};

/** Mirrors the API state machine so admin users can only choose valid next steps. */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['ready_for_shipment', 'cancelled'],
  ready_for_shipment: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed', 'returned'],
  completed: ['returned'],
  cancelled: [],
  returned: ['refund_pending', 'completed'],
  refund_pending: ['refunded', 'completed'],
  refunded: [],
};

export const PAYMENT_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  paid: { label: 'Paid', badgeVariant: 'default' },
  refund_pending: { label: 'Refund pending', badgeVariant: 'secondary' },
  refunded: { label: 'Refunded', badgeVariant: 'outline' },
  cancelled: { label: 'Cancelled', badgeVariant: 'destructive' },
};

export const ORDER_FILTER_STATUSES: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'ready_for_shipment', label: 'Ready for shipment' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refund_pending', label: 'Refund pending' },
  { value: 'refunded', label: 'Refunded' },
];

/** Admin orders list filter — operational statuses staff actually search by. */
export const ADMIN_ORDER_FILTER_STATUSES: Array<{ value: string; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packed', label: 'Packed' },
  { value: 'ready_for_shipment', label: 'Ready for shipment' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  confirmed: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  packed: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  ready_for_shipment: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  shipped: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  delivered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  completed: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300',
  returned: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  refund_pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  refunded: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300',
};

export function orderStatusBadgeClass(status: string): string {
  return (
    ORDER_STATUS_BADGE_CLASS[status] ?? 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-300'
  );
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_CONFIG[status]?.label ?? status.replace(/_/g, ' ');
}

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  timestampField: keyof Order;
}

export const ORDER_TIMELINE_STEPS: OrderTimelineStep[] = [
  { status: 'pending', label: 'Order created', timestampField: 'placedAt' },
  { status: 'confirmed', label: 'Confirmed', timestampField: 'confirmedAt' },
  { status: 'packed', label: 'Packed', timestampField: 'packedAt' },
  {
    status: 'ready_for_shipment',
    label: 'Ready for shipment',
    timestampField: 'readyForShipmentAt',
  },
  { status: 'shipped', label: 'Shipped', timestampField: 'shippedAt' },
  { status: 'delivered', label: 'Delivered', timestampField: 'deliveredAt' },
  { status: 'completed', label: 'Completed', timestampField: 'completedAt' },
];

export const ORDER_TERMINAL_STEPS: OrderTimelineStep[] = [
  { status: 'cancelled', label: 'Cancelled', timestampField: 'cancelledAt' },
  { status: 'returned', label: 'Returned', timestampField: 'updatedAt' },
  { status: 'refund_pending', label: 'Refund pending', timestampField: 'updatedAt' },
  { status: 'refunded', label: 'Refunded', timestampField: 'updatedAt' },
];

export const RETURN_REASONS = [
  'Wrong item received',
  'Item damaged',
  'Item defective',
  'Size or fit issue',
  'Changed my mind',
  'Other',
] as const;

export const RETURN_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  requested: { label: 'Requested', badgeVariant: 'secondary' },
  approved: { label: 'Approved', badgeVariant: 'default' },
  rejected: { label: 'Rejected', badgeVariant: 'destructive' },
  processing: { label: 'Processing', badgeVariant: 'default' },
  completed: { label: 'Completed', badgeVariant: 'outline' },
};
