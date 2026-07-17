import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface PasswordResetTokenDocument extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date | null;
  requestedIp?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
    requestedIp: { type: String, default: null },
  },
  { timestamps: true, collection: 'password_reset_tokens' },
);

passwordResetTokenSchema.index({ tokenHash: 1 }, { unique: true });

export const PasswordResetTokenModel: Model<PasswordResetTokenDocument> =
  model<PasswordResetTokenDocument>('PasswordResetToken', passwordResetTokenSchema);
