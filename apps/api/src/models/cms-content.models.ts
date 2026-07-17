import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { mediaImageSchema, responsiveImageSchema, seoSchema } from '@/models/shared/seo.schema';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

const bannerBase = {
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: null },
  images: { type: responsiveImageSchema, default: () => ({}) },
  ctaLabel: { type: String, default: null },
  ctaUrl: { type: String, default: null },
  buttonText: { type: String, default: null },
  priority: { type: Number, default: 0, index: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['draft', 'active', 'scheduled', 'inactive', 'archived'],
    default: 'draft',
    index: true,
  },
  ...softDelete,
};

export const HeroBannerModel = model(
  'HeroBanner',
  new Schema(
    {
      ...bannerBase,
      collectionId: { type: Schema.Types.ObjectId, ref: 'Collection', default: null },
    },
    { timestamps: true, collection: 'hero_banners' },
  ),
);

export const PromoBannerModel = model(
  'PromoBanner',
  new Schema(
    {
      ...bannerBase,
      placement: { type: String, default: 'home' },
    },
    { timestamps: true, collection: 'promo_banners' },
  ),
);

export const AnnouncementBarModel = model(
  'AnnouncementBar',
  new Schema(
    {
      message: { type: String, required: true },
      linkUrl: { type: String, default: null },
      linkLabel: { type: String, default: null },
      backgroundColor: { type: String, default: null },
      textColor: { type: String, default: null },
      priority: { type: Number, default: 0 },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ['draft', 'active', 'scheduled', 'inactive', 'archived'],
        default: 'draft',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'announcement_bars' },
  ),
);

export const HomeSectionModel = model(
  'HomeSection',
  new Schema(
    {
      key: { type: String, required: true, trim: true },
      title: { type: String, required: true },
      subtitle: { type: String, default: null },
      type: {
        type: String,
        enum: ['hero', 'collection', 'products', 'banners', 'custom', 'html'],
        default: 'custom',
      },
      content: { type: Schema.Types.Mixed, default: {} },
      sortOrder: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'draft',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'home_sections' },
  ),
);
HomeSectionModel.schema.index({ key: 1 }, { unique: true });

export const FaqModel = model(
  'Faq',
  new Schema(
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      category: { type: String, default: null, index: true },
      sortOrder: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'faqs' },
  ),
);

export interface CmsPageVersion {
  version: number;
  title: string;
  content: string;
  savedAt: Date;
  savedBy?: Types.ObjectId | null;
}

export interface CmsPageDocument extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  featuredImage?: unknown;
  status: string;
  seo?: unknown;
  publishAt?: Date | null;
  authorId?: Types.ObjectId | null;
  versions: CmsPageVersion[];
  version: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
}

const cmsPageSchema = new Schema<CmsPageDocument>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: String, default: '' },
    excerpt: { type: String, default: null },
    featuredImage: { type: mediaImageSchema, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      default: 'draft',
      index: true,
    },
    seo: { type: seoSchema, default: () => ({}) },
    publishAt: { type: Date, default: null },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 1 },
    versions: {
      type: [
        {
          version: Number,
          title: String,
          content: String,
          savedAt: Date,
          savedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        },
      ],
      default: [],
    },
    ...softDelete,
  },
  { timestamps: true, collection: 'cms_pages' },
);
cmsPageSchema.index({ slug: 1 }, { unique: true });

export const CmsPageModel: Model<CmsPageDocument> = model('CmsPage', cmsPageSchema);

export const BlogCategoryModel = model(
  'BlogCategory',
  new Schema(
    {
      name: { type: String, required: true },
      slug: { type: String, required: true },
      description: { type: String, default: null },
      seo: { type: seoSchema, default: () => ({}) },
      status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'blog_categories' },
  ),
);
BlogCategoryModel.schema.index({ slug: 1 }, { unique: true });

export const BlogPostModel = model(
  'BlogPost',
  new Schema(
    {
      title: { type: String, required: true },
      slug: { type: String, required: true },
      excerpt: { type: String, default: null },
      content: { type: String, default: '' },
      coverImage: { type: mediaImageSchema, default: null },
      authorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      categoryIds: [{ type: Schema.Types.ObjectId, ref: 'BlogCategory' }],
      tags: { type: [String], default: [] },
      status: {
        type: String,
        enum: ['draft', 'published', 'scheduled', 'archived'],
        default: 'draft',
        index: true,
      },
      isFeatured: { type: Boolean, default: false },
      publishAt: { type: Date, default: null },
      seo: { type: seoSchema, default: () => ({}) },
      ...softDelete,
    },
    { timestamps: true, collection: 'blogs' },
  ),
);
BlogPostModel.schema.index({ slug: 1 }, { unique: true });
BlogPostModel.schema.index({ status: 1, publishAt: -1 });
