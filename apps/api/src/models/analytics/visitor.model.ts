import { Schema, model, type Document, type Types } from 'mongoose';

export interface GeoData {
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface DeviceData {
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  os?: string | null;
  osVersion?: string | null;
  browser?: string | null;
  browserVersion?: string | null;
  screenResolution?: string | null;
  language?: string | null;
}

export interface VisitorDocument extends Document {
  visitorId: string;
  userId?: Types.ObjectId | null;
  ipHash: string;
  geo: GeoData;
  device: DeviceData;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  igshid?: string | null;
  inAppSource?: string | null;
  landingPath?: string | null;
  trafficSource: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  totalVisits: number;
  totalSessions: number;
  isReturning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const geoSchema = new Schema<GeoData>(
  {
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    region: { type: String, default: null },
    city: { type: String, default: null },
    timezone: { type: String, default: null },
  },
  { _id: false },
);

const deviceSchema = new Schema<DeviceData>(
  {
    type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
    os: { type: String, default: null },
    osVersion: { type: String, default: null },
    browser: { type: String, default: null },
    browserVersion: { type: String, default: null },
    screenResolution: { type: String, default: null },
    language: { type: String, default: null },
  },
  { _id: false },
);

const visitorSchema = new Schema<VisitorDocument>(
  {
    visitorId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    ipHash: { type: String, required: true },
    geo: { type: geoSchema, default: () => ({}) },
    device: { type: deviceSchema, default: () => ({ type: 'unknown' }) },
    referrer: { type: String, default: null },
    utmSource: { type: String, default: null },
    utmMedium: { type: String, default: null },
    utmCampaign: { type: String, default: null },
    utmTerm: { type: String, default: null },
    utmContent: { type: String, default: null },
    fbclid: { type: String, default: null },
    gclid: { type: String, default: null },
    ttclid: { type: String, default: null },
    msclkid: { type: String, default: null },
    igshid: { type: String, default: null },
    inAppSource: { type: String, default: null },
    landingPath: { type: String, default: null },
    trafficSource: { type: String, default: 'direct', index: true },
    firstSeenAt: { type: Date, required: true, index: true },
    lastSeenAt: { type: Date, required: true, index: true },
    totalVisits: { type: Number, default: 1 },
    totalSessions: { type: Number, default: 1 },
    isReturning: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'pa_visitors' },
);

visitorSchema.index({ lastSeenAt: -1 });
visitorSchema.index({ 'geo.country': 1, lastSeenAt: -1 });
visitorSchema.index({ 'device.type': 1 });
visitorSchema.index({ 'device.browser': 1 });
visitorSchema.index({ trafficSource: 1, lastSeenAt: -1 });
visitorSchema.index({ userId: 1, lastSeenAt: -1 });

export const VisitorModel = model<VisitorDocument>('PaVisitor', visitorSchema);
