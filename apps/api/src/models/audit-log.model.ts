import { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface AuditLogDocument extends Document {
  actorUserId?: Types.ObjectId | null;
  actorType: 'user' | 'system' | 'anonymous';
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorType: { type: String, enum: ['user', 'system', 'anonymous'], required: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    requestId: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' },
);

auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel: Model<AuditLogDocument> = model<AuditLogDocument>(
  'AuditLog',
  auditLogSchema,
);
