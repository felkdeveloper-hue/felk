/**
 * Payment Engine constants (Phase 10).
 * Payments are independent from Orders — no order coupling anywhere here.
 */

export const PAYMENT_PERMISSIONS = {
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_VIEW_OWN: 'payments.view_own',
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_REFUND: 'payments.refund',
  PAYMENTS_EXPORT: 'payments.export',
  PAYMENTS_MANAGE: 'payments.manage',
} as const;

export const PAYMENT_ATTEMPT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export type PaymentAttemptStatus =
  (typeof PAYMENT_ATTEMPT_STATUS)[keyof typeof PAYMENT_ATTEMPT_STATUS];

export const REFUND_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REJECTED: 'rejected',
} as const;

export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

export const REFUND_TYPE = {
  PARTIAL: 'partial',
  FULL: 'full',
} as const;

/** Settlement — structure only, no reconciliation logic yet. */
export const SETTLEMENT_STATUS = {
  PENDING: 'pending',
  SETTLED: 'settled',
  FAILED: 'failed',
} as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUS)[keyof typeof SETTLEMENT_STATUS];

export const PAYMENT_AUDIT = {
  PAYMENT_CREATED: 'payment.created',
  GATEWAY_REDIRECT: 'payment.gateway_redirect',
  WEBHOOK_RECEIVED: 'payment.webhook_received',
  VERIFICATION_SUCCESS: 'payment.verification_success',
  VERIFICATION_FAILED: 'payment.verification_failed',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_RETRIED: 'payment.retried',
  PAYMENT_EXPIRED: 'payment.expired',
  REFUND_REQUESTED: 'payment.refund_requested',
  REFUND_COMPLETED: 'payment.refund_completed',
} as const;

/** Events published by the Payment Engine — publish only, never consumed here. */
export const PAYMENT_EVENT_TYPE = {
  PAYMENT_CREATED: 'PaymentCreated',
  PAYMENT_AUTHORIZED: 'PaymentAuthorized',
  PAYMENT_SUCCEEDED: 'PaymentSucceeded',
  PAYMENT_FAILED: 'PaymentFailed',
  REFUND_REQUESTED: 'RefundRequested',
  REFUND_COMPLETED: 'RefundCompleted',
} as const;

export type PaymentEventType = (typeof PAYMENT_EVENT_TYPE)[keyof typeof PAYMENT_EVENT_TYPE];

/** Default attempt/payment link lifetime before it must be retried. */
export const PAYMENT_ATTEMPT_TTL_MINUTES = 30;

/** Ceiling on retry attempts per payment before it must be abandoned. */
export const PAYMENT_MAX_RETRY_ATTEMPTS = 5;

/** Replay-protection window — webhooks older than this (by gateway timestamp, if provided) are rejected. */
export const WEBHOOK_REPLAY_WINDOW_MINUTES = 15;
