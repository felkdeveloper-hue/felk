import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface ActivityLogDocument extends Document {
  actorUserId?: Types.ObjectId | null;
  summary: string;
  module: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  createdAt: Date;
}

const activityLogSchema = new Schema<ActivityLogDocument>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    summary: { type: String, required: true },
    module: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'activity_logs' },
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLogModel: Model<ActivityLogDocument> = model<ActivityLogDocument>(
  'ActivityLog',
  activityLogSchema,
);
