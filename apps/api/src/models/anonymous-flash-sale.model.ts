import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface AnonymousFlashSaleDocument {
  ipHash: string;
  flashSaleStartTime: Date;
  transferredAt?: Date | null;
  transferredToCustomerId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AnonymousFlashSaleDoc = HydratedDocument<AnonymousFlashSaleDocument>;

const anonymousFlashSaleSchema = new Schema<AnonymousFlashSaleDocument>(
  {
    ipHash: { type: String, required: true, unique: true, index: true },
    flashSaleStartTime: { type: Date, required: true },
    transferredAt: { type: Date, default: null },
    transferredToCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  },
  { timestamps: true },
);

anonymousFlashSaleSchema.index({ flashSaleStartTime: 1 });
anonymousFlashSaleSchema.index({ transferredAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AnonymousFlashSaleModel = model<AnonymousFlashSaleDocument>(
  'AnonymousFlashSale',
  anonymousFlashSaleSchema,
);
