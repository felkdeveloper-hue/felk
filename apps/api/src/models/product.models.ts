import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { seoSchema } from '@/models/shared/seo.schema';
import {
  PRODUCT_STATUS,
  PRODUCT_VISIBILITY,
  VARIANT_STATUS,
  RELATIONSHIP_TYPES,
  MEDIA_TYPES,
} from '@/constants/product';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

const moneyFields = {
  price: { type: Number, default: 0 },
  salePrice: { type: Number, default: null },
  compareAtPrice: { type: Number, default: null },
  costPrice: { type: Number, default: null },
  currency: { type: String, default: 'LKR' },
  taxClass: { type: String, default: null },
  saleStartsAt: { type: Date, default: null },
  saleEndsAt: { type: Date, default: null },
};

/** Attribute definition (e.g. Fit, Neckline) */
export const ProductAttributeModel = model(
  'ProductAttribute',
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      code: { type: String, required: true, trim: true },
      type: {
        type: String,
        enum: ['text', 'number', 'boolean', 'select', 'multiselect'],
        default: 'select',
      },
      unit: { type: String, default: null },
      isFilterable: { type: Boolean, default: true },
      isRequired: { type: Boolean, default: false },
      sortOrder: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'product_attributes' },
  ),
);
ProductAttributeModel.schema.index({ code: 1 }, { unique: true });

/** Attribute value options */
export const AttributeValueModel = model(
  'AttributeValue',
  new Schema(
    {
      attributeId: {
        type: Schema.Types.ObjectId,
        ref: 'ProductAttribute',
        required: true,
        index: true,
      },
      value: { type: String, required: true, trim: true },
      label: { type: String, required: true, trim: true },
      sortOrder: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
      },
      ...softDelete,
    },
    { timestamps: true, collection: 'attribute_values' },
  ),
);
AttributeValueModel.schema.index({ attributeId: 1, value: 1 }, { unique: true });

export interface ProductDocument extends Document {
  name: string;
  slug: string;
  sku?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  brandId?: Types.ObjectId | null;
  categoryId?: Types.ObjectId | null;
  subcategoryId?: Types.ObjectId | null;
  collectionIds: Types.ObjectId[];
  seasonId?: Types.ObjectId | null;
  materialId?: Types.ObjectId | null;
  gender?: string | null;
  ageGroup?: string | null;
  occasionIds: Types.ObjectId[];
  tags: string[];
  /** Payment acceptance: cod | prepaid | both */
  paymentOption: string;
  returnsAvailable: boolean;
  returnsCriteria?: string | null;
  warrantyAvailable: boolean;
  warrantyDetails?: string | null;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isClearance: boolean;
  status: string;
  visibility: string;
  publishAt?: Date | null;
  archiveAt?: Date | null;
  seo?: unknown;
  searchKeywords: string[];
  specifications: Array<{ name: string; value: string; group?: string; sortOrder?: number }>;
  attributeLinks: Array<{
    attributeId: Types.ObjectId;
    valueId?: Types.ObjectId | null;
    customValue?: string | null;
  }>;
  pricing: {
    price: number;
    salePrice?: number | null;
    compareAtPrice?: number | null;
    costPrice?: number | null;
    currency: string;
    taxClass?: string | null;
    saleStartsAt?: Date | null;
    saleEndsAt?: Date | null;
  };
  defaultVariantId?: Types.ObjectId | null;
  variantCount: number;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    sku: { type: String, default: null, trim: true, uppercase: true },
    shortDescription: { type: String, default: null },
    description: { type: String, default: null },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    subcategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    collectionIds: [{ type: Schema.Types.ObjectId, ref: 'Collection', index: true }],
    seasonId: { type: Schema.Types.ObjectId, ref: 'SeasonCollection', default: null },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', default: null },
    gender: { type: String, default: null, index: true },
    ageGroup: { type: String, default: null },
    occasionIds: [{ type: Schema.Types.ObjectId, ref: 'Occasion' }],
    tags: { type: [String], default: [], index: true },
    paymentOption: {
      type: String,
      enum: ['cod', 'prepaid', 'both'],
      default: 'both',
    },
    returnsAvailable: { type: Boolean, default: true },
    returnsCriteria: { type: String, default: null },
    warrantyAvailable: { type: Boolean, default: false },
    warrantyDetails: { type: String, default: null },
    isFeatured: { type: Boolean, default: false, index: true },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isClearance: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(PRODUCT_VISIBILITY),
      default: PRODUCT_VISIBILITY.PUBLIC,
    },
    publishAt: { type: Date, default: null, index: true },
    archiveAt: { type: Date, default: null },
    seo: { type: seoSchema, default: () => ({}) },
    searchKeywords: { type: [String], default: [] },
    specifications: {
      type: [
        {
          name: { type: String, required: true },
          value: { type: String, required: true },
          group: { type: String, default: 'General' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    attributeLinks: {
      type: [
        {
          attributeId: { type: Schema.Types.ObjectId, ref: 'ProductAttribute', required: true },
          valueId: { type: Schema.Types.ObjectId, ref: 'AttributeValue', default: null },
          customValue: { type: String, default: null },
        },
      ],
      default: [],
    },
    pricing: {
      type: new Schema(moneyFields, { _id: false }),
      default: () => ({ price: 0, currency: 'LKR' }),
    },
    defaultVariantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
    variantCount: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    ...softDelete,
  },
  { timestamps: true, collection: 'products' },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);
productSchema.index({ status: 1, isDeleted: 1, publishAt: -1 });
productSchema.index({
  name: 'text',
  shortDescription: 'text',
  tags: 'text',
  searchKeywords: 'text',
});
productSchema.index({ 'pricing.price': 1 });
productSchema.index({ createdAt: -1 });

export const ProductModel: Model<ProductDocument> = model('Product', productSchema);

export interface ProductVariantDocument extends Document {
  productId: Types.ObjectId;
  sku: string;
  barcode?: string | null;
  title: string;
  colorId?: Types.ObjectId | null;
  sizeId?: Types.ObjectId | null;
  optionValues: Record<string, string>;
  weightGrams?: number | null;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string } | null;
  price: number;
  salePrice?: number | null;
  costPrice?: number | null;
  compareAtPrice?: number | null;
  taxClass?: string | null;
  currency: string;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  status: string;
  primaryImageId?: Types.ObjectId | null;
  thumbnailUrl?: string | null;
  displayOrder: number;
  isDefault: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ProductVariantDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    colorId: { type: Schema.Types.ObjectId, ref: 'Color', default: null, index: true },
    sizeId: { type: Schema.Types.ObjectId, ref: 'Size', default: null, index: true },
    optionValues: { type: Map, of: String, default: {} },
    weightGrams: { type: Number, default: null },
    dimensions: {
      type: new Schema(
        {
          length: Number,
          width: Number,
          height: Number,
          unit: { type: String, default: 'cm' },
        },
        { _id: false },
      ),
      default: null,
    },
    price: { type: Number, required: true, default: 0 },
    salePrice: { type: Number, default: null },
    costPrice: { type: Number, default: null },
    compareAtPrice: { type: Number, default: null },
    taxClass: { type: String, default: null },
    currency: { type: String, default: 'LKR' },
    saleStartsAt: { type: Date, default: null },
    saleEndsAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(VARIANT_STATUS),
      default: VARIANT_STATUS.ACTIVE,
      index: true,
    },
    primaryImageId: { type: Schema.Types.ObjectId, ref: 'ProductMedia', default: null },
    thumbnailUrl: { type: String, default: null },
    displayOrder: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    ...softDelete,
  },
  { timestamps: true, collection: 'product_variants' },
);

variantSchema.index({ sku: 1 }, { unique: true });
// Only index real barcodes — sparse unique still treats multiple `null` values as duplicates.
variantSchema.index(
  { barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } },
);
variantSchema.index({ productId: 1, colorId: 1, sizeId: 1 });
variantSchema.index({ productId: 1, isDeleted: 1, displayOrder: 1 });

export const ProductVariantModel: Model<ProductVariantDocument> = model(
  'ProductVariant',
  variantSchema,
);

export const ProductMediaModel = model(
  'ProductMedia',
  new Schema(
    {
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null, index: true },
      type: {
        type: String,
        enum: Object.values(MEDIA_TYPES),
        default: MEDIA_TYPES.IMAGE,
      },
      url: { type: String, required: true },
      key: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      alt: { type: String, default: null },
      mimeType: { type: String, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      sizeBytes: { type: Number, default: null },
      priority: { type: Number, default: 0, index: true },
      isPrimary: { type: Boolean, default: false },
      isThumbnail: { type: Boolean, default: false },
      isGallery: { type: Boolean, default: true },
      ...softDelete,
    },
    { timestamps: true, collection: 'product_media' },
  ),
);

export const ProductRelationshipModel = model(
  'ProductRelationship',
  new Schema(
    {
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
      relatedProductId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
      },
      type: {
        type: String,
        enum: Object.values(RELATIONSHIP_TYPES),
        required: true,
        index: true,
      },
      sortOrder: { type: Number, default: 0 },
      ...softDelete,
    },
    { timestamps: true, collection: 'product_relationships' },
  ),
);
ProductRelationshipModel.schema.index(
  { productId: 1, relatedProductId: 1, type: 1 },
  { unique: true },
);
