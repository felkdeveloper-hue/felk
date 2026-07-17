import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { ORDER_STATUS } from '@/constants/order-status';
import { RETURN_STATUS, EXCHANGE_STATUS } from '@/constants/order';

const addressSnapshotSchema = new Schema(
  {
    addressId: { type: Schema.Types.ObjectId, ref: 'CustomerAddress', default: null },
    fullName: { type: String, default: null },
    phone: { type: String, default: null },
    line1: { type: String, default: null },
    line2: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    postalCode: { type: String, default: null },
    country: { type: String, default: null },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/* Order Item — immutable purchase-time snapshot                             */
/* -------------------------------------------------------------------------- */

export interface OrderItemSubdocument {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  variantTitle?: string | null;
  sku: string;
  barcode?: string | null;
  images: string[];
  price: number;
  salePrice?: number | null;
  discount: number;
  tax: number;
  shipping: number;
  quantity: number;
  weightGrams: number;
  lineSubtotal: number;
  lineTotal: number;
  warehouseId?: Types.ObjectId | null;
  reservationId?: Types.ObjectId | null;
}

const orderItemSchema = new Schema<OrderItemSubdocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    name: { type: String, required: true },
    variantTitle: { type: String, default: null },
    sku: { type: String, required: true },
    barcode: { type: String, default: null },
    images: { type: [String], default: [] },
    price: { type: Number, required: true },
    salePrice: { type: Number, default: null },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    weightGrams: { type: Number, default: 0 },
    lineSubtotal: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    reservationId: { type: Schema.Types.ObjectId, ref: 'StockReservation', default: null },
  },
  { timestamps: false },
);

/* -------------------------------------------------------------------------- */
/* Order                                                                     */
/* -------------------------------------------------------------------------- */

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  giftCard: number;
  grandTotal: number;
  totalWeightGrams: number;
  totalQuantity: number;
}

export interface OrderDocument extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  paymentId: Types.ObjectId;
  checkoutId: Types.ObjectId;
  checkoutToken: string;
  customerId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  status: string;
  items: Types.DocumentArray<OrderItemSubdocument>;
  shippingAddress?: Record<string, unknown> | null;
  billingAddress?: Record<string, unknown> | null;
  shippingMethod?: string | null;
  deliveryMethod?: string | null;
  currency: string;
  totals: OrderTotals;
  paymentMethod: string;
  paymentReference: string;
  paidAt?: Date | null;
  placedAt: Date;
  confirmedAt?: Date | null;
  packedAt?: Date | null;
  readyForShipmentAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelReason?: string | null;
  reservationIds: Types.ObjectId[];
  metadata: Record<string, unknown>;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const totalsSchema = new Schema<OrderTotals>(
  {
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    giftCard: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    totalWeightGrams: { type: Number, default: 0 },
    totalQuantity: { type: Number, default: 0 },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    checkoutId: { type: Schema.Types.ObjectId, ref: 'CheckoutSession', required: true },
    checkoutToken: { type: String, required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    items: { type: [orderItemSchema], default: [] },
    shippingAddress: { type: addressSnapshotSchema, default: null },
    billingAddress: { type: addressSnapshotSchema, default: null },
    shippingMethod: { type: String, default: null },
    deliveryMethod: { type: String, default: null },
    currency: { type: String, required: true, default: 'LKR' },
    totals: { type: totalsSchema, default: () => ({}) },
    paymentMethod: { type: String, required: true },
    paymentReference: { type: String, required: true },
    paidAt: { type: Date, default: null },
    placedAt: { type: Date, default: () => new Date() },
    confirmedAt: { type: Date, default: null },
    packedAt: { type: Date, default: null },
    readyForShipmentAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    reservationIds: [{ type: Schema.Types.ObjectId, ref: 'StockReservation' }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'orders' },
);

// One order per payment — the idempotency guard for PaymentSucceeded consumption.
orderSchema.index({ paymentId: 1 }, { unique: true });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const OrderModel: Model<OrderDocument> = model('Order', orderSchema);

/* -------------------------------------------------------------------------- */
/* Order Timeline                                                             */
/* -------------------------------------------------------------------------- */

export interface OrderTimelineDocument extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  event: string;
  status?: string | null;
  note?: string | null;
  actorUserId?: Types.ObjectId | null;
  actorType: 'user' | 'system';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const orderTimelineSchema = new Schema<OrderTimelineDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    event: { type: String, required: true },
    status: { type: String, default: null },
    note: { type: String, default: null },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorType: { type: String, enum: ['user', 'system'], default: 'system' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'order_timeline' },
);

orderTimelineSchema.index({ orderId: 1, createdAt: 1 });

export const OrderTimelineModel: Model<OrderTimelineDocument> = model(
  'OrderTimeline',
  orderTimelineSchema,
);

/* -------------------------------------------------------------------------- */
/* Order Notes                                                               */
/* -------------------------------------------------------------------------- */

export interface OrderNoteDocument extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  note: string;
  isInternal: boolean;
  authorUserId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderNoteSchema = new Schema<OrderNoteDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    note: { type: String, required: true, trim: true },
    isInternal: { type: Boolean, default: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'order_notes' },
);

orderNoteSchema.index({ orderId: 1, createdAt: -1 });

export const OrderNoteModel: Model<OrderNoteDocument> = model('OrderNote', orderNoteSchema);

/* -------------------------------------------------------------------------- */
/* Invoice                                                                    */
/* -------------------------------------------------------------------------- */

export interface InvoiceDocument extends Document {
  _id: Types.ObjectId;
  invoiceNumber: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  customerId: Types.ObjectId;
  currency: string;
  billingAddress?: Record<string, unknown> | null;
  shippingAddress?: Record<string, unknown> | null;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    discount: number;
    tax: number;
    lineTotal: number;
  }>;
  totals: OrderTotals;
  taxDetails: { gstNumber?: string | null; vatNumber?: string | null; note: string };
  paymentReference: string;
  paymentMethod: string;
  pdf: { status: string; url: string | null; message: string };
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceLineSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    orderNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    currency: { type: String, required: true },
    billingAddress: { type: addressSnapshotSchema, default: null },
    shippingAddress: { type: addressSnapshotSchema, default: null },
    items: { type: [invoiceLineSchema], default: [] },
    totals: { type: totalsSchema, default: () => ({}) },
    taxDetails: {
      gstNumber: { type: String, default: null },
      vatNumber: { type: String, default: null },
      note: { type: String, default: 'GST/VAT calculation reserved for a future phase' },
    },
    paymentReference: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    pdf: {
      status: { type: String, default: 'not_generated' },
      url: { type: String, default: null },
      message: { type: String, default: 'PDF rendering reserved for a future phase' },
    },
    issuedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: 'invoices' },
);

export const InvoiceModel: Model<InvoiceDocument> = model('Invoice', invoiceSchema);

/* -------------------------------------------------------------------------- */
/* Returns — structure only                                                  */
/* -------------------------------------------------------------------------- */

export interface ReturnRequestDocument extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  orderItemId?: Types.ObjectId | null;
  customerId: Types.ObjectId;
  reason: string;
  description?: string | null;
  images: string[];
  status: string;
  requestedBy?: Types.ObjectId | null;
  approvedBy?: Types.ObjectId | null;
  resolution?: string | null;
  history: Array<{ status: string; note?: string | null; at: Date; actorUserId?: string | null }>;
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: null },
    at: { type: Date, default: () => new Date() },
    actorUserId: { type: String, default: null },
  },
  { _id: false },
);

const returnRequestSchema = new Schema<ReturnRequestDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderItemId: { type: Schema.Types.ObjectId, default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    reason: { type: String, required: true },
    description: { type: String, default: null },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(RETURN_STATUS),
      default: RETURN_STATUS.REQUESTED,
      index: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolution: { type: String, default: null },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true, collection: 'return_requests' },
);

export const ReturnRequestModel: Model<ReturnRequestDocument> = model(
  'ReturnRequest',
  returnRequestSchema,
);

/* -------------------------------------------------------------------------- */
/* Exchange Requests — structure only                                        */
/* -------------------------------------------------------------------------- */

export interface ExchangeRequestDocument extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  orderItemId: Types.ObjectId;
  customerId: Types.ObjectId;
  reason: string;
  desiredVariantId?: Types.ObjectId | null;
  status: string;
  history: Array<{ status: string; note?: string | null; at: Date; actorUserId?: string | null }>;
  createdAt: Date;
  updatedAt: Date;
}

const exchangeRequestSchema = new Schema<ExchangeRequestDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    reason: { type: String, required: true },
    desiredVariantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    status: {
      type: String,
      enum: Object.values(EXCHANGE_STATUS),
      default: EXCHANGE_STATUS.REQUESTED,
      index: true,
    },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true, collection: 'exchange_requests' },
);

export const ExchangeRequestModel: Model<ExchangeRequestDocument> = model(
  'ExchangeRequest',
  exchangeRequestSchema,
);

/* -------------------------------------------------------------------------- */
/* Order Event — durable outbox of published domain events                  */
/* -------------------------------------------------------------------------- */

export interface OrderEventDocument extends Document {
  _id: Types.ObjectId;
  type: string;
  orderId?: Types.ObjectId | null;
  paymentId?: Types.ObjectId | null;
  payload: Record<string, unknown>;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderEventSchema = new Schema<OrderEventDocument>(
  {
    type: { type: String, required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    publishedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: 'order_events' },
);

export const OrderEventModel: Model<OrderEventDocument> = model('OrderEvent', orderEventSchema);
