import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { PAYMENT_STATUS } from '@/constants/payment-status';
import {
  PAYMENT_ATTEMPT_STATUS,
  REFUND_STATUS,
  REFUND_TYPE,
  SETTLEMENT_STATUS,
} from '@/constants/payment';

/* -------------------------------------------------------------------------- */
/* Payment — one per checkout session's attempt to pay                       */
/* -------------------------------------------------------------------------- */

export interface PaymentDocument extends Document {
  _id: Types.ObjectId;
  referenceNumber: string;
  checkoutId: Types.ObjectId;
  checkoutToken: string;
  customerId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  method: string;
  status: string;
  amount: number;
  currency: string;
  gatewayPaymentId?: string | null;
  redirectUrl?: string | null;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  attemptCount: number;
  maxAttempts: number;
  paidAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  expiresAt: Date;
  metadata: Record<string, unknown>;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    referenceNumber: { type: String, required: true, unique: true, index: true },
    checkoutId: {
      type: Schema.Types.ObjectId,
      ref: 'CheckoutSession',
      required: true,
      index: true,
    },
    checkoutToken: { type: String, required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    method: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'LKR' },
    gatewayPaymentId: { type: String, default: null, index: true },
    redirectUrl: { type: String, default: null },
    returnUrl: { type: String, required: true },
    cancelUrl: { type: String, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'payments' },
);

// One non-terminal payment per checkout at a time (retry reuses the same document).
paymentSchema.index({ checkoutId: 1, customerId: 1, createdAt: -1 });

export const PaymentModel: Model<PaymentDocument> = model('Payment', paymentSchema);

/* -------------------------------------------------------------------------- */
/* Payment Attempt — one per gateway redirect / retry                        */
/* -------------------------------------------------------------------------- */

export interface PaymentAttemptDocument extends Document {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  attemptNumber: number;
  gateway: string;
  status: string;
  gatewayPaymentId?: string | null;
  redirectUrl?: string | null;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentAttemptSchema = new Schema<PaymentAttemptDocument>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    attemptNumber: { type: Number, required: true },
    gateway: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(PAYMENT_ATTEMPT_STATUS),
      default: PAYMENT_ATTEMPT_STATUS.PENDING,
      index: true,
    },
    gatewayPaymentId: { type: String, default: null },
    redirectUrl: { type: String, default: null },
    requestPayload: { type: Schema.Types.Mixed, default: null },
    responsePayload: { type: Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, collection: 'payment_attempts' },
);

paymentAttemptSchema.index({ paymentId: 1, attemptNumber: -1 });

export const PaymentAttemptModel: Model<PaymentAttemptDocument> = model(
  'PaymentAttempt',
  paymentAttemptSchema,
);

/* -------------------------------------------------------------------------- */
/* Payment Transaction — immutable ledger of gateway-confirmed events         */
/* -------------------------------------------------------------------------- */

export interface PaymentTransactionDocument extends Document {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  attemptId?: Types.ObjectId | null;
  gateway: string;
  gatewayTransactionId?: string | null;
  referenceNumber: string;
  amount: number;
  currency: string;
  status: string;
  gatewayResponse?: Record<string, unknown> | null;
  rawPayload?: string | null;
  signature?: string | null;
  verificationResult: {
    valid: boolean;
    reason?: string | null;
  };
  processingTimeMs: number;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new Schema<PaymentTransactionDocument>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    attemptId: { type: Schema.Types.ObjectId, ref: 'PaymentAttempt', default: null },
    gateway: { type: String, required: true },
    gatewayTransactionId: { type: String, default: null, index: true },
    referenceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true },
    gatewayResponse: { type: Schema.Types.Mixed, default: null },
    rawPayload: { type: String, default: null },
    signature: { type: String, default: null },
    verificationResult: {
      valid: { type: Boolean, required: true },
      reason: { type: String, default: null },
    },
    processingTimeMs: { type: Number, default: 0 },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'payment_transactions' },
);

export const PaymentTransactionModel: Model<PaymentTransactionDocument> = model(
  'PaymentTransaction',
  paymentTransactionSchema,
);

/* -------------------------------------------------------------------------- */
/* Payment Webhook — inbound audit + idempotency / replay-protection ledger  */
/* -------------------------------------------------------------------------- */

export interface PaymentWebhookDocument extends Document {
  _id: Types.ObjectId;
  gateway: string;
  eventId: string;
  paymentId?: Types.ObjectId | null;
  headers: Record<string, unknown>;
  signature?: string | null;
  rawPayload?: string | null;
  ip?: string | null;
  processed: boolean;
  processingResult?: string | null;
  verified: boolean;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentWebhookSchema = new Schema<PaymentWebhookDocument>(
  {
    gateway: { type: String, required: true, index: true },
    eventId: { type: String, required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
    headers: { type: Schema.Types.Mixed, default: {} },
    signature: { type: String, default: null },
    rawPayload: { type: String, default: null },
    ip: { type: String, default: null },
    processed: { type: Boolean, default: false },
    processingResult: { type: String, default: null },
    verified: { type: Boolean, default: false },
    receivedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: 'payment_webhooks' },
);

// Replay protection: the same gateway can never process the same event twice.
paymentWebhookSchema.index({ gateway: 1, eventId: 1 }, { unique: true });

export const PaymentWebhookModel: Model<PaymentWebhookDocument> = model(
  'PaymentWebhook',
  paymentWebhookSchema,
);

/* -------------------------------------------------------------------------- */
/* Payment Event — durable outbox of published domain events                 */
/* -------------------------------------------------------------------------- */

export interface PaymentEventDocument extends Document {
  _id: Types.ObjectId;
  type: string;
  paymentId?: Types.ObjectId | null;
  checkoutId?: Types.ObjectId | null;
  payload: Record<string, unknown>;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentEventSchema = new Schema<PaymentEventDocument>(
  {
    type: { type: String, required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
    checkoutId: { type: Schema.Types.ObjectId, ref: 'CheckoutSession', default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: 'payment_events' },
);

export const PaymentEventModel: Model<PaymentEventDocument> = model(
  'PaymentEvent',
  paymentEventSchema,
);

/* -------------------------------------------------------------------------- */
/* Payment Log — human-readable, payment-scoped lifecycle timeline           */
/* -------------------------------------------------------------------------- */

export interface PaymentLogDocument extends Document {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentLogSchema = new Schema<PaymentLogDocument>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    action: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'payment_logs' },
);

paymentLogSchema.index({ paymentId: 1, createdAt: -1 });

export const PaymentLogModel: Model<PaymentLogDocument> = model('PaymentLog', paymentLogSchema);

/* -------------------------------------------------------------------------- */
/* Refund — structure only, no gateway reconciliation yet                    */
/* -------------------------------------------------------------------------- */

export interface RefundDocument extends Document {
  _id: Types.ObjectId;
  paymentId: Types.ObjectId;
  refundType: string;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  requestedBy?: Types.ObjectId | null;
  approvedBy?: Types.ObjectId | null;
  gatewayRefundId?: string | null;
  gatewayResponse?: Record<string, unknown> | null;
  history: Array<{
    status: string;
    note?: string | null;
    at: Date;
    actorUserId?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const refundHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: null },
    at: { type: Date, default: () => new Date() },
    actorUserId: { type: String, default: null },
  },
  { _id: false },
);

const refundSchema = new Schema<RefundDocument>(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    refundType: {
      type: String,
      enum: Object.values(REFUND_TYPE),
      default: REFUND_TYPE.FULL,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    gatewayRefundId: { type: String, default: null },
    gatewayResponse: { type: Schema.Types.Mixed, default: null },
    history: { type: [refundHistorySchema], default: [] },
  },
  { timestamps: true, collection: 'refunds' },
);

export const RefundModel: Model<RefundDocument> = model('Refund', refundSchema);

/* -------------------------------------------------------------------------- */
/* Settlement — structure only, batches of gateway payouts                  */
/* -------------------------------------------------------------------------- */

export interface SettlementDocument extends Document {
  _id: Types.ObjectId;
  gateway: string;
  settlementReference?: string | null;
  settlementDate?: Date | null;
  amount: number;
  currency: string;
  status: string;
  transactionIds: Types.ObjectId[];
  rawPayload?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<SettlementDocument>(
  {
    gateway: { type: String, required: true, index: true },
    settlementReference: { type: String, default: null },
    settlementDate: { type: Date, default: null },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'LKR' },
    status: {
      type: String,
      enum: Object.values(SETTLEMENT_STATUS),
      default: SETTLEMENT_STATUS.PENDING,
      index: true,
    },
    transactionIds: [{ type: Schema.Types.ObjectId, ref: 'PaymentTransaction' }],
    rawPayload: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: 'settlements' },
);

export const SettlementModel: Model<SettlementDocument> = model('Settlement', settlementSchema);
