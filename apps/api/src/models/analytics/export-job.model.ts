import { Schema, model, type Document, type Types } from 'mongoose';

export type AnalyticsExportFormat = 'csv' | 'xlsx' | 'pdf';
export type AnalyticsExportStatus = 'processing' | 'ready' | 'failed';

export interface AnalyticsExportJobDocument extends Document {
  reportType: string;
  reportTitle: string;
  format: AnalyticsExportFormat;
  status: AnalyticsExportStatus;
  filter: Record<string, unknown>;
  scope: 'all' | 'page';
  columns?: string[] | null;
  drillLabel?: string | null;
  actorUserId?: Types.ObjectId | null;
  recordCount: number;
  fileKey?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  error?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AnalyticsExportJobDocument>(
  {
    reportType: { type: String, required: true, index: true },
    reportTitle: { type: String, required: true },
    format: { type: String, enum: ['csv', 'xlsx', 'pdf'], required: true },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
      index: true,
    },
    filter: { type: Schema.Types.Mixed, default: {} },
    scope: { type: String, enum: ['all', 'page'], default: 'all' },
    columns: { type: [String], default: null },
    drillLabel: { type: String, default: null },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    recordCount: { type: Number, default: 0 },
    fileKey: { type: String, default: null },
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    contentType: { type: String, default: null },
    error: { type: String, default: null },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: 'pa_export_jobs' },
);

schema.index({ actorUserId: 1, createdAt: -1 });

export const AnalyticsExportJobModel = model<AnalyticsExportJobDocument>(
  'PaAnalyticsExportJob',
  schema,
);
