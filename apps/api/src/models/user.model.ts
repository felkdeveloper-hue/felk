import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import type { RoleKey } from '@/constants/roles';
import type { UserStatus } from '@/constants/auth';
import { USER_STATUS } from '@/constants/auth';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  passwordHistory: string[];
  firstName: string;
  lastName: string;
  phone?: string | null;
  roleId: Types.ObjectId;
  roleKey: RoleKey;
  status: UserStatus;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  passwordChangedAt?: Date | null;
  mfaEnabled: boolean;
  googleId?: string | null;
  avatarUrl?: string | null;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    passwordHistory: { type: [String], default: [], select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    roleKey: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING_VERIFICATION,
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    mfaEnabled: { type: Boolean, default: false },
    googleId: { type: String, default: null, sparse: true },
    avatarUrl: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });
userSchema.index({ status: 1, isDeleted: 1 });

export const UserModel: Model<UserDocument> = model<UserDocument>('User', userSchema);
