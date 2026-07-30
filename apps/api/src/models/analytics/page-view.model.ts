import { Schema, model, type Document, type Types } from 'mongoose';

export interface PageViewDocument extends Document {
  sessionId: string;
  visitorId: string;
  userId?: Types.ObjectId | null;
  path: string;
  title?: string | null;
  referrer?: string | null;
  viewedAt: Date;
  timeOnPageMs?: number | null;
  scrollDepth: number;
  isExit: boolean;
  isEntry: boolean;
  deviceType: string;
  country?: string | null;
}

const pageViewSchema = new Schema<PageViewDocument>(
  {
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    path: { type: String, required: true, index: true },
    title: { type: String, default: null },
    referrer: { type: String, default: null },
    viewedAt: { type: Date, required: true, index: true },
    timeOnPageMs: { type: Number, default: null },
    scrollDepth: { type: Number, default: 0 },
    isExit: { type: Boolean, default: false },
    isEntry: { type: Boolean, default: false },
    deviceType: { type: String, default: 'unknown' },
    country: { type: String, default: null },
  },
  { timestamps: false, collection: 'pa_page_views' },
);

pageViewSchema.index({ path: 1, viewedAt: -1 });
pageViewSchema.index({ sessionId: 1, viewedAt: 1 });
pageViewSchema.index({ visitorId: 1, viewedAt: -1 });
pageViewSchema.index({ viewedAt: -1 });

export const PageViewModel = model<PageViewDocument>('PaPageView', pageViewSchema);
