import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface RefreshTokenDocument extends Document {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  replacedByTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'UserSession', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true, collection: 'refresh_tokens' },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ familyId: 1, revokedAt: 1 });

export const RefreshTokenModel: Model<RefreshTokenDocument> = model<RefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema,
);
