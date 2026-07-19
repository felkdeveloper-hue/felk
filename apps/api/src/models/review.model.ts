/**
 * Product review model — verified-purchase reviews with optional images.
 */
import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export interface ReviewImage {
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
}

export interface ReviewDocument extends Document {
  productId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  rating: number;
  title?: string | null;
  body: string;
  images: ReviewImage[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  moderatedBy?: Types.ObjectId | null;
  moderatedAt?: Date | null;
  moderationNote?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewImageSchema = new Schema<ReviewImage>(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    alt: { type: String, default: null },
  },
  { _id: false },
);

const reviewSchema = new Schema<ReviewDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: null, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    images: { type: [reviewImageSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING,
      index: true,
    },
    isVerifiedPurchase: { type: Boolean, default: true },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
    moderationNote: { type: String, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'reviews' },
);

reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index(
  { productId: 1, customerId: 1, orderId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const ReviewModel: Model<ReviewDocument> = model('Review', reviewSchema);
