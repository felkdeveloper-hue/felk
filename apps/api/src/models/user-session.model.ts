import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface UserSessionDocument extends Document {
  userId: Types.ObjectId;
  familyId: string;
  deviceLabel?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  rememberMe: boolean;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSessionSchema = new Schema<UserSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    deviceLabel: { type: String, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    rememberMe: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: null },
  },
  { timestamps: true, collection: 'user_sessions' },
);

userSessionSchema.index({ userId: 1, revokedAt: 1 });

export const UserSessionModel: Model<UserSessionDocument> = model<UserSessionDocument>(
  'UserSession',
  userSessionSchema,
);
