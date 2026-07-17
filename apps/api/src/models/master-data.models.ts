import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { mediaImageSchema, seoSchema } from '@/models/shared/seo.schema';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

const statusField = {
  type: String,
  enum: ['draft', 'active', 'inactive', 'archived', 'published', 'scheduled'],
  default: 'active',
  index: true,
};

export interface CategoryDocument extends Document {
  name: string;
  slug: string;
  parentId?: Types.ObjectId | null;
  path: string;
  depth: number;
  description?: string | null;
  image?: unknown;
  sortOrder: number;
  seo?: unknown;
  status: string;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    path: { type: String, default: '', index: true },
    depth: { type: Number, default: 0 },
    description: { type: String, default: null },
    image: { type: mediaImageSchema, default: null },
    sortOrder: { type: Number, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    status: statusField,
    ...softDelete,
  },
  { timestamps: true, collection: 'categories' },
);
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1, sortOrder: 1 });

export const CategoryModel: Model<CategoryDocument> = model('Category', categorySchema);

function defineMasterModel(
  name: string,
  collection: string,
  extra: Record<string, unknown> = {},
  extraIndexes: Array<[Record<string, 1>, { unique?: boolean }?]> = [],
) {
  const schema = new Schema(
    {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, trim: true },
      description: { type: String, default: null },
      sortOrder: { type: Number, default: 0 },
      seo: { type: seoSchema, default: () => ({}) },
      status: statusField,
      ...extra,
      ...softDelete,
    },
    { timestamps: true, collection },
  );
  schema.index({ slug: 1 }, { unique: true });
  schema.index({ name: 1 });
  for (const [fields, options] of extraIndexes) {
    schema.index(fields, options);
  }
  return model(name, schema);
}

export const BrandModel = defineMasterModel('Brand', 'brands', {
  logo: { type: mediaImageSchema, default: null },
  website: { type: String, default: null },
});

export const CollectionModel = defineMasterModel('Collection', 'collections', {
  type: { type: String, enum: ['manual', 'automated'], default: 'manual' },
  productIds: [{ type: Schema.Types.ObjectId }],
  heroImage: { type: mediaImageSchema, default: null },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
});

export const ColorModel = defineMasterModel(
  'Color',
  'colors',
  {
    code: { type: String, required: true, trim: true },
    hex: { type: String, default: null },
    swatchImage: { type: mediaImageSchema, default: null },
  },
  [[{ code: 1 }, { unique: true }]],
);

export const SizeModel = defineMasterModel(
  'Size',
  'sizes',
  {
    code: { type: String, required: true, trim: true },
    chart: { type: String, default: null },
  },
  [[{ code: 1 }, { unique: true }]],
);

export const MaterialModel = defineMasterModel(
  'Material',
  'materials',
  {
    code: { type: String, required: true, trim: true },
  },
  [[{ code: 1 }, { unique: true }]],
);

export const ProductTagModel = defineMasterModel('ProductTag', 'product_tags', {
  color: { type: String, default: null },
});

export const OccasionModel = defineMasterModel('Occasion', 'occasions');

export const SeasonCollectionModel = defineMasterModel('SeasonCollection', 'season_collections', {
  season: { type: String, required: true },
  year: { type: Number, default: null },
  heroImage: { type: mediaImageSchema, default: null },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
});
