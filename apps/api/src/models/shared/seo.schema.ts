import { Schema, type InferSchemaType } from 'mongoose';

export const seoSchema = new Schema(
  {
    title: { type: String, default: null },
    description: { type: String, default: null },
    canonicalUrl: { type: String, default: null },
    keywords: { type: [String], default: [] },
    ogImage: { type: String, default: null },
    twitterCard: { type: String, default: 'summary_large_image' },
    schemaJson: { type: Schema.Types.Mixed, default: null },
    robots: { type: String, default: 'index,follow' },
  },
  { _id: false },
);

export const mediaImageSchema = new Schema(
  {
    url: { type: String, required: true },
    key: { type: String, default: null },
    alt: { type: String, default: null },
  },
  { _id: false },
);

export const responsiveImageSchema = new Schema(
  {
    desktop: { type: mediaImageSchema, default: null },
    tablet: { type: mediaImageSchema, default: null },
    mobile: { type: mediaImageSchema, default: null },
  },
  { _id: false },
);

export type SeoFields = InferSchemaType<typeof seoSchema>;
export type MediaImage = InferSchemaType<typeof mediaImageSchema>;
