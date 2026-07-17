import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { CHECKOUT_STATUS, SHIPPING_METHOD, DELIVERY_METHOD } from '@/constants/checkout';

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

const lineSchema = new Schema(
  {
    cartItemId: { type: Schema.Types.ObjectId, ref: 'CartItem', default: null },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    salePrice: { type: Number, default: null },
    compareAtPrice: { type: Number, default: null },
    lineSubtotal: { type: Number, required: true },
    weightGrams: { type: Number, default: 0 },
    taxClass: { type: String, default: null },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    reservationId: { type: Schema.Types.ObjectId, ref: 'StockReservation', default: null },
  },
  { _id: false },
);

const totalsSchema = new Schema(
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

export interface CheckoutSessionDocument extends Document {
  checkoutToken: string;
  customerId: Types.ObjectId;
  cartId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  status: string;
  currency: string;
  lines: Array<{
    cartItemId?: Types.ObjectId | null;
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    sku: string;
    title: string;
    quantity: number;
    unitPrice: number;
    salePrice?: number | null;
    compareAtPrice?: number | null;
    lineSubtotal: number;
    weightGrams: number;
    taxClass?: string | null;
    warehouseId?: Types.ObjectId | null;
    reservationId?: Types.ObjectId | null;
  }>;
  shippingAddress?: Record<string, unknown> | null;
  billingAddress?: Record<string, unknown> | null;
  shippingMethod: string;
  deliveryMethod: string;
  shippingZoneId?: Types.ObjectId | null;
  shippingEstimate: Record<string, unknown>;
  taxEstimate: Record<string, unknown>;
  coupon: Record<string, unknown>;
  giftCard: Record<string, unknown>;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    giftCard: number;
    grandTotal: number;
    totalWeightGrams: number;
    totalQuantity: number;
  };
  reservationIds: Types.ObjectId[];
  reservationExpiresAt?: Date | null;
  reservationTimeoutMinutes: number;
  expiresAt?: Date | null;
  validationIssues: unknown[];
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutSessionSchema = new Schema<CheckoutSessionDocument>(
  {
    checkoutToken: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: Object.values(CHECKOUT_STATUS),
      default: CHECKOUT_STATUS.OPEN,
      index: true,
    },
    currency: { type: String, default: 'LKR' },
    lines: { type: [lineSchema], default: [] },
    shippingAddress: { type: addressSnapshotSchema, default: null },
    billingAddress: { type: addressSnapshotSchema, default: null },
    shippingMethod: {
      type: String,
      enum: Object.values(SHIPPING_METHOD),
      default: SHIPPING_METHOD.STANDARD,
    },
    deliveryMethod: {
      type: String,
      enum: Object.values(DELIVERY_METHOD),
      default: DELIVERY_METHOD.DELIVERY,
    },
    shippingZoneId: { type: Schema.Types.ObjectId, ref: 'ShippingZone', default: null },
    shippingEstimate: { type: Schema.Types.Mixed, default: {} },
    taxEstimate: { type: Schema.Types.Mixed, default: {} },
    coupon: {
      type: Schema.Types.Mixed,
      default: () => ({
        status: 'placeholder',
        code: null,
        amount: 0,
        message: 'Coupon engine reserved for future phase',
      }),
    },
    giftCard: {
      type: Schema.Types.Mixed,
      default: () => ({
        status: 'placeholder',
        code: null,
        amount: 0,
        message: 'Gift card engine reserved for future phase',
      }),
    },
    totals: { type: totalsSchema, default: () => ({}) },
    reservationIds: [{ type: Schema.Types.ObjectId, ref: 'StockReservation' }],
    reservationExpiresAt: { type: Date, default: null, index: true },
    reservationTimeoutMinutes: { type: Number, default: 30 },
    expiresAt: { type: Date, default: null, index: true },
    validationIssues: { type: [Schema.Types.Mixed], default: [] } as never,
    metadata: { type: Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'checkout_sessions' },
);

checkoutSessionSchema.index({ customerId: 1, status: 1, createdAt: -1 });
checkoutSessionSchema.index(
  { customerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['open', 'reserved', 'ready'] },
      isDeleted: false,
    },
  },
);

export const CheckoutSessionModel: Model<CheckoutSessionDocument> = model(
  'CheckoutSession',
  checkoutSessionSchema,
);
