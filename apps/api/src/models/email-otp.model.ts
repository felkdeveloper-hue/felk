import { Schema, model, type Document, type Types } from 'mongoose';

export interface EmailOtpDocument extends Document {
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const emailOtpSchema = new Schema<EmailOtpDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true, collection: 'email_otps' },
);

emailOtpSchema.index({ email: 1, verified: 1, createdAt: -1 });

export const EmailOtpModel = model<EmailOtpDocument>('EmailOtp', emailOtpSchema);
