import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface PasswordResetTokenDocument extends Document {
  userId: Types.ObjectId;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date | null;
  requestedIp?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
    requestedIp: { type: String, default: null },
  },
  { timestamps: true, collection: 'password_reset_tokens' },
);

// Codes are short numeric OTPs — collisions across users are expected, so we
// look these up by userId rather than a unique code hash index.
passwordResetTokenSchema.index({ userId: 1, consumedAt: 1 });

export const PasswordResetTokenModel: Model<PasswordResetTokenDocument> =
  model<PasswordResetTokenDocument>('PasswordResetToken', passwordResetTokenSchema);
