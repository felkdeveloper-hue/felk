import type { Order, OrderStatus } from '@/services/sdk';

export interface OrderStatusConfig {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const ORDER_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  pending: { label: 'Pending', badgeVariant: 'secondary' },
  confirmed: { label: 'Confirmed', badgeVariant: 'default' },
  packed: { label: 'Packed', badgeVariant: 'default' },
  ready_for_shipment: { label: 'Ready to ship', badgeVariant: 'default' },
  shipped: { label: 'Shipped', badgeVariant: 'default' },
  delivered: { label: 'Delivered', badgeVariant: 'default' },
  completed: { label: 'Completed', badgeVariant: 'default' },
  cancelled: { label: 'Cancelled', badgeVariant: 'destructive' },
  returned: { label: 'Returned', badgeVariant: 'outline' },
  refund_pending: { label: 'Refund pending', badgeVariant: 'secondary' },
  refunded: { label: 'Refunded', badgeVariant: 'outline' },
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
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'refund_pending', label: 'Refund pending' },
  { value: 'refunded', label: 'Refunded' },
];

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
