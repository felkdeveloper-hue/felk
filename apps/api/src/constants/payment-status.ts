export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  AUTHORIZED: 'authorized',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUND_PENDING: 'refund_pending',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Statuses that must never be set by anything other than a verified webhook. */
export const PAYMENT_TERMINAL_SUCCESS_STATUSES = [
  PAYMENT_STATUS.AUTHORIZED,
  PAYMENT_STATUS.PAID,
] as const;

export const PAYMENT_TERMINAL_STATUSES = [
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.EXPIRED,
  PAYMENT_STATUS.REFUNDED,
] as const;

/** Live, integrated gateways. */
export const PAYMENT_METHOD = {
  PAYHERE: 'payhere',
  KOKO: 'koko',
  MINTPAY: 'mintpay',
  COD: 'cod',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/** Recognized but not yet implemented — reserved for future adapters. */
export const FUTURE_PAYMENT_METHOD = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
} as const;

export type FuturePaymentMethod =
  (typeof FUTURE_PAYMENT_METHOD)[keyof typeof FUTURE_PAYMENT_METHOD];

export const ALL_PAYMENT_METHODS = {
  ...PAYMENT_METHOD,
  ...FUTURE_PAYMENT_METHOD,
} as const;
