import { Schema, model, type Document, type Types } from 'mongoose';

export interface SessionDocument extends Document {
  sessionId: string;
  visitorId: string;
  userId?: Types.ObjectId | null;
  startedAt: Date;
  endedAt?: Date | null;
  lastActiveAt: Date;
  durationMs?: number | null;
  isActive: boolean;
  entryPage?: string | null;
  exitPage?: string | null;
  pageCount: number;
  clickCount: number;
  maxScrollDepth: number;
  deviceType: string;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  trafficSource: string;
  isBounce: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    visitorId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    startedAt: { type: Date, required: true, index: true },
    endedAt: { type: Date, default: null },
    lastActiveAt: { type: Date, required: true },
    durationMs: { type: Number, default: null },
    isActive: { type: Boolean, default: true, index: true },
    entryPage: { type: String, default: null },
    exitPage: { type: String, default: null },
    pageCount: { type: Number, default: 1 },
    clickCount: { type: Number, default: 0 },
    maxScrollDepth: { type: Number, default: 0 },
    deviceType: { type: String, default: 'unknown' },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    country: { type: String, default: null },
    trafficSource: { type: String, default: 'direct' },
    isBounce: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'pa_sessions' },
);

sessionSchema.index({ visitorId: 1, startedAt: -1 });
sessionSchema.index({ startedAt: -1 });
sessionSchema.index({ isActive: 1, lastActiveAt: -1 });
sessionSchema.index({ userId: 1, startedAt: -1 });
sessionSchema.index({ country: 1, startedAt: -1 });

export const SessionModel = model<SessionDocument>('PaSession', sessionSchema);
