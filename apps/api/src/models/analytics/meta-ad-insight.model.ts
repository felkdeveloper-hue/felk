import { Schema, model, type Document } from 'mongoose';

/**
 * Daily Meta Ads Insights row — genuine Marketing API data only.
 * Unique per account + date + ad (or campaign/adset rollup level).
 */
export interface MetaAdInsightDocument extends Document {
  accountId: string;
  metricDate: string; // YYYY-MM-DD in reporting timezone
  level: 'account' | 'campaign' | 'adset' | 'ad';
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  /** Null = Meta did not return the field (UI must show Unavailable, not 0). */
  reach: number | null;
  impressions: number | null;
  linkClicks: number | null;
  outboundClicks: number | null;
  landingPageViews: number | null;
  spend: number | null;
  cpc: number | null;
  cpm: number | null;
  ctr: number | null;
  currency: string | null;
  syncedAt: Date;
  rawActions?: unknown;
}

const metaAdInsightSchema = new Schema<MetaAdInsightDocument>(
  {
    accountId: { type: String, required: true, index: true },
    metricDate: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ['account', 'campaign', 'adset', 'ad'],
      required: true,
      default: 'ad',
    },
    campaignId: { type: String, default: null, index: true },
    campaignName: { type: String, default: null },
    adsetId: { type: String, default: null, index: true },
    adsetName: { type: String, default: null },
    adId: { type: String, default: null, index: true },
    adName: { type: String, default: null },
    reach: { type: Number, default: null },
    impressions: { type: Number, default: null },
    linkClicks: { type: Number, default: null },
    outboundClicks: { type: Number, default: null },
    landingPageViews: { type: Number, default: null },
    spend: { type: Number, default: null },
    cpc: { type: Number, default: null },
    cpm: { type: Number, default: null },
    ctr: { type: Number, default: null },
    currency: { type: String, default: null },
    syncedAt: { type: Date, required: true },
    rawActions: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'pa_meta_ad_insights' },
);

metaAdInsightSchema.index(
  {
    accountId: 1,
    metricDate: 1,
    level: 1,
    campaignId: 1,
    adsetId: 1,
    adId: 1,
  },
  { unique: true },
);
metaAdInsightSchema.index({ metricDate: 1, accountId: 1 });
metaAdInsightSchema.index({ syncedAt: -1 });

export const MetaAdInsightModel = model<MetaAdInsightDocument>(
  'PaMetaAdInsight',
  metaAdInsightSchema,
);
