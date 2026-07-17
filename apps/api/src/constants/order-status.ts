/**
 * Order status — orders only ever come into existence after a verified
 * PaymentSucceeded event, so there is no "awaiting payment" / "payment
 * failed" state here (that lifecycle belongs entirely to the Payment Engine).
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  READY_FOR_SHIPMENT: 'ready_for_shipment',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);

/** Statuses before which an order can still be cancelled with a full inventory reversal. */
export const CANCELLABLE_ORDER_STATUSES = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.READY_FOR_SHIPMENT,
] as const;

export const TERMINAL_ORDER_STATUSES = [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] as const;

/** Allowed forward transitions — enforced by the order service on every status change. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PACKED]: [ORDER_STATUS.READY_FOR_SHIPMENT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY_FOR_SHIPMENT]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.RETURNED],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.RETURNED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.RETURNED]: [ORDER_STATUS.REFUND_PENDING],
  [ORDER_STATUS.REFUND_PENDING]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [],
};
