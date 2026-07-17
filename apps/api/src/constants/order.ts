/**
 * Order Management constants (Phase 11).
 * Orders are created only by consuming a verified PaymentSucceeded event —
 * nothing here ever re-verifies a payment.
 */

export const ORDER_PERMISSIONS = {
  ORDERS_NOTES: 'orders.notes',
  ORDERS_INVOICE: 'orders.invoice',
  ORDERS_RETURN_OWN: 'orders.return_own',
  ORDERS_RETURN_MANAGE: 'orders.return_manage',
} as const;

export const ORDER_AUDIT = {
  ORDER_CREATED: 'order.created',
  STATUS_CHANGED: 'order.status_changed',
  INVOICE_GENERATED: 'order.invoice_generated',
  CANCELLED: 'order.cancelled',
  NOTE_ADDED: 'order.note_added',
  RETURN_REQUESTED: 'order.return_requested',
} as const;

/** Events consumed from the Payment Engine — never published by Orders. */
export const CONSUMED_PAYMENT_EVENT_TYPES = ['PaymentSucceeded'] as const;

/** Events published by Order Management — publish only, no one here consumes them. */
export const ORDER_EVENT_TYPE = {
  ORDER_CREATED: 'OrderCreated',
  ORDER_CANCELLED: 'OrderCancelled',
  ORDER_DELIVERED: 'OrderDelivered',
  ORDER_REFUND_REQUESTED: 'OrderRefundRequested',
} as const;

export type OrderEventType = (typeof ORDER_EVENT_TYPE)[keyof typeof ORDER_EVENT_TYPE];

export const RETURN_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type ReturnStatus = (typeof RETURN_STATUS)[keyof typeof RETURN_STATUS];

export const EXCHANGE_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

export type ExchangeStatus = (typeof EXCHANGE_STATUS)[keyof typeof EXCHANGE_STATUS];

/** GST/VAT is a placeholder until a real tax provider is wired in. */
export const INVOICE_TAX_PLACEHOLDER = {
  gstNumber: null as string | null,
  vatNumber: null as string | null,
  note: 'GST/VAT calculation reserved for a future phase',
};
