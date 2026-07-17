import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { CART_ITEM_LOCATION, CART_STATUS } from '@/constants/cart';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

export interface CartDocument extends Document {
  customerId?: Types.ObjectId | null;
  guestToken?: string | null;
  currency: string;
  status: string;
  mergedIntoCartId?: Types.ObjectId | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<CartDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    guestToken: { type: String, default: null, index: true },
    currency: { type: String, default: 'LKR' },
    status: {
      type: String,
      enum: Object.values(CART_STATUS),
      default: CART_STATUS.ACTIVE,
      index: true,
    },
    mergedIntoCartId: { type: Schema.Types.ObjectId, ref: 'Cart', default: null },
    notes: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ...softDelete,
  },
  { timestamps: true, collection: 'carts' },
);

cartSchema.index(
  { customerId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { customerId: { $type: 'objectId' }, status: 'active' },
  },
);
cartSchema.index(
  { guestToken: 1, status: 1 },
  { unique: true, partialFilterExpression: { guestToken: { $type: 'string' }, status: 'active' } },
);

export const CartModel: Model<CartDocument> = model('Cart', cartSchema);

export interface CartItemDocument extends Document {
  cartId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  guestToken?: string | null;
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  sku: string;
  title: string;
  colorId?: Types.ObjectId | null;
  sizeId?: Types.ObjectId | null;
  colorName?: string | null;
  sizeName?: string | null;
  quantity: number;
  location: string;
  weightGrams: number;
  currency: string;
  priceAtAdd: number;
  currentPrice: number;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  priceChanged: boolean;
  priceDifference: number;
  lineSubtotal: number;
  thumbnailUrl?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItemDocument>(
  {
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    guestToken: { type: String, default: null, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    colorId: { type: Schema.Types.ObjectId, ref: 'Color', default: null },
    sizeId: { type: Schema.Types.ObjectId, ref: 'Size', default: null },
    colorName: { type: String, default: null },
    sizeName: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    location: {
      type: String,
      enum: Object.values(CART_ITEM_LOCATION),
      default: CART_ITEM_LOCATION.CART,
      index: true,
    },
    weightGrams: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'LKR' },
    priceAtAdd: { type: Number, required: true, min: 0 },
    currentPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null },
    compareAtPrice: { type: Number, default: null },
    priceChanged: { type: Boolean, default: false },
    priceDifference: { type: Number, default: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    thumbnailUrl: { type: String, default: null },
    ...softDelete,
  },
  { timestamps: true, collection: 'cart_items' },
);

cartItemSchema.index({ cartId: 1, location: 1, isDeleted: 1 });
cartItemSchema.index(
  { cartId: 1, variantId: 1, location: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

export const CartItemModel: Model<CartItemDocument> = model('CartItem', cartItemSchema);
