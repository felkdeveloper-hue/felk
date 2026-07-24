import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type VerificationPurpose = 'email_verification';

export interface VerificationTokenDocument extends Document {
  userId: Types.ObjectId;
  codeHash: string;
  purpose: VerificationPurpose;
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const verificationTokenSchema = new Schema<VerificationTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['email_verification'], default: 'email_verification' },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'verification_tokens' },
);

// Codes are short numeric OTPs — collisions across users are expected, so we
// look these up by userId/purpose rather than a unique code hash index.
verificationTokenSchema.index({ userId: 1, purpose: 1, consumedAt: 1 });

export const VerificationTokenModel: Model<VerificationTokenDocument> =
  model<VerificationTokenDocument>('VerificationToken', verificationTokenSchema);
