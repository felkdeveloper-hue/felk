import { Schema, model } from 'mongoose';

export type EmailLogStatus = 'pending' | 'sent' | 'failed' | 'retrying';

const emailLogSchema = new Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    templateKey: { type: String, default: null },
    html: { type: String, default: null },
    text: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'retrying'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String, default: null },
    messageId: { type: String, default: null },
    nextAttemptAt: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'email_logs' },
);

emailLogSchema.index({ status: 1, nextAttemptAt: 1 });

export const EmailLogModel = model('EmailLog', emailLogSchema);
