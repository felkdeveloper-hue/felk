import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type VerificationPurpose = 'email_verification';

export interface VerificationTokenDocument extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  purpose: VerificationPurpose;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const verificationTokenSchema = new Schema<VerificationTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    purpose: { type: String, enum: ['email_verification'], default: 'email_verification' },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'verification_tokens' },
);

verificationTokenSchema.index({ tokenHash: 1 }, { unique: true });

export const VerificationTokenModel: Model<VerificationTokenDocument> =
  model<VerificationTokenDocument>('VerificationToken', verificationTokenSchema);
