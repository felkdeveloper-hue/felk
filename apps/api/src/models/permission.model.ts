import { Schema, model, type Document, type Model } from 'mongoose';

export interface PermissionDocument extends Document {
  key: string;
  module: string;
  action: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<PermissionDocument>(
  {
    key: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true, index: true },
    action: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'permissions' },
);

permissionSchema.index({ key: 1 }, { unique: true });

export const PermissionModel: Model<PermissionDocument> = model<PermissionDocument>(
  'Permission',
  permissionSchema,
);
