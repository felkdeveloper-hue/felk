import { Schema, model, type Document, type Types } from 'mongoose';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationDocument extends Document {
  userId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  title: string;
  message: string;
  severity: NotificationSeverity;
  linkUrl?: string | null;
  linkLabel?: string | null;
  campaignKey?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    linkUrl: { type: String, default: null },
    linkLabel: { type: String, default: null },
    campaignKey: { type: String, default: null, index: true },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'notifications' },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, campaignKey: 1 }, { unique: true, sparse: true });

export const NotificationModel = model<NotificationDocument>('Notification', notificationSchema);
