import { Schema, model, type Document, type Types } from 'mongoose';

export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'session_start',
  'session_end',
  'click',
  'scroll',
  'login',
  'logout',
  'signup',
  'order_created',
  'order_updated',
  'order_cancelled',
  'payment_completed',
  'payment_failed',
  'profile_updated',
  'password_changed',
  'add_to_cart',
  'remove_from_cart',
  'add_to_wishlist',
  'search',
  'custom',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface EventDocument extends Document {
  eventId: string;
  name: string;
  sessionId?: string | null;
  visitorId?: string | null;
  userId?: Types.ObjectId | null;
  path?: string | null;
  properties?: Record<string, unknown>;
  occurredAt: Date;
  deviceType?: string | null;
  country?: string | null;
}

const eventSchema = new Schema<EventDocument>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    sessionId: { type: String, default: null, index: true },
    visitorId: { type: String, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    path: { type: String, default: null },
    properties: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, index: true },
    deviceType: { type: String, default: null },
    country: { type: String, default: null },
  },
  { timestamps: false, collection: 'pa_events' },
);

eventSchema.index({ name: 1, occurredAt: -1 });
eventSchema.index({ userId: 1, occurredAt: -1 });
eventSchema.index({ occurredAt: -1 });
eventSchema.index({ sessionId: 1, occurredAt: 1 });

export const EventModel = model<EventDocument>('PaEvent', eventSchema);
