import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import type { RoleKey } from '@/constants/roles';

export interface RoleDocument extends Document {
  key: RoleKey | string;
  name: string;
  description?: string;
  permissionIds: Types.ObjectId[];
  isSystem: boolean;
  status: 'active' | 'inactive';
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<RoleDocument>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    permissionIds: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'roles' },
);

roleSchema.index({ key: 1 }, { unique: true });

export const RoleModel: Model<RoleDocument> = model<RoleDocument>('Role', roleSchema);
