import { Schema, model } from 'mongoose';

export type AnalyticsProvider = 'meta' | 'tiktok';
export type AnalyticsEventStatus = 'pending' | 'sent' | 'failed' | 'retrying';

const analyticsEventLogSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ['meta', 'tiktok'],
      required: true,
      index: true,
    },
    eventName: { type: String, required: true },
    eventId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'retrying'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    payload: { type: Schema.Types.Mixed, default: null },
    lastError: { type: String, default: null },
    nextAttemptAt: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'analytics_event_logs' },
);

analyticsEventLogSchema.index({ provider: 1, status: 1, nextAttemptAt: 1 });
analyticsEventLogSchema.index({ eventId: 1, provider: 1 }, { unique: true });

export const AnalyticsEventLogModel = model('AnalyticsEventLog', analyticsEventLogSchema);
