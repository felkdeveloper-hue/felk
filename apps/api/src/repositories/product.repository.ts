import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { BaseRepository, type ListOptions } from '@/repositories/base.repository';
import { ProductModel, ProductVariantModel, type ProductDocument } from '@/models/product.models';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { parseSort } from '@/utils/sorting';

export interface ProductListFilters extends ListOptions {
  sku?: string;
  barcode?: string;
  brandId?: string;
  categoryId?: string;
  subcategoryId?: string;
  collectionId?: string;
  tag?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  gender?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isClearance?: boolean;
  visibility?: string;
  excludeStatuses?: string[];
  excludeVisibility?: string[];
  createdFrom?: string;
  createdTo?: string;
  publishFrom?: string;
  publishTo?: string;
}

export class ProductRepository extends BaseRepository {
  constructor() {
    super(
      ProductModel,
      ['name', 'slug', 'shortDescription', 'tags', 'searchKeywords'],
      ['createdAt', 'updatedAt', 'name', 'publishAt', 'pricing.price', 'status', 'variantCount'],
    );
  }

  async findBySku(sku: string) {
    return ProductVariantModel.findOne({
      sku: sku.toUpperCase(),
      isDeleted: false,
    });
  }

  async findByBarcode(barcode: string) {
    return ProductVariantModel.findOne({ barcode, isDeleted: false });
  }

  async findProductIdsBySkuOrBarcode(sku?: string, barcode?: string) {
    const or: FilterQuery<typeof ProductVariantModel>[] = [];
    if (sku) or.push({ sku: new RegExp(`^${escapeRegex(sku)}$`, 'i') });
    if (barcode) or.push({ barcode });
    if (!or.length) return null;

    const variants = await ProductVariantModel.find({
      isDeleted: false,
      $or: or,
    })
      .select('productId')
      .lean();

    return [...new Set(variants.map((v) => v.productId.toString()))];
  }

  async listCatalog(options: ProductListFilters) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};

    if (!options.includeDeleted) {
      filter.isDeleted = false;
    }
    if (options.status) {
      filter.status = options.status;
    } else if (options.excludeStatuses?.length) {
      filter.status = { $nin: options.excludeStatuses };
    }
    if (options.visibility) {
      filter.visibility = options.visibility;
    } else if (options.excludeVisibility?.length) {
      filter.visibility = { $nin: options.excludeVisibility };
    }
    if (options.brandId) {
      const brandId = toObjectId(options.brandId);
      if (brandId) filter.brandId = brandId;
    }
    if (options.categoryId) {
      const categoryId = toObjectId(options.categoryId);
      if (categoryId) filter.categoryId = categoryId;
    }
    if (options.subcategoryId) {
      const subcategoryId = toObjectId(options.subcategoryId);
      if (subcategoryId) filter.subcategoryId = subcategoryId;
    }
    if (options.collectionId) {
      const collectionId = toObjectId(options.collectionId);
      if (collectionId) filter.collectionIds = collectionId;
    }
    if (options.tag) filter.tags = options.tag;
    if (options.tags?.length) filter.tags = { $all: options.tags };
    if (options.gender) filter.gender = options.gender;
    if (options.isFeatured !== undefined) filter.isFeatured = options.isFeatured;
    if (options.isTrending !== undefined) filter.isTrending = options.isTrending;
    if (options.isNewArrival !== undefined) filter.isNewArrival = options.isNewArrival;
    if (options.isBestSeller !== undefined) filter.isBestSeller = options.isBestSeller;
    if (options.isClearance !== undefined) filter.isClearance = options.isClearance;

    if (options.minPrice != null || options.maxPrice != null) {
      const price: Record<string, number> = {};
      if (options.minPrice != null) price.$gte = options.minPrice;
      if (options.maxPrice != null) price.$lte = options.maxPrice;
      filter['pricing.price'] = price;
    }

    if (options.createdFrom || options.createdTo) {
      const createdAt: Record<string, Date> = {};
      if (options.createdFrom) createdAt.$gte = new Date(options.createdFrom);
      if (options.createdTo) createdAt.$lte = new Date(options.createdTo);
      filter.createdAt = createdAt;
    }

    if (options.publishFrom || options.publishTo) {
      const publishAt: Record<string, Date> = {};
      if (options.publishFrom) publishAt.$gte = new Date(options.publishFrom);
      if (options.publishTo) publishAt.$lte = new Date(options.publishTo);
      filter.publishAt = publishAt;
    }

    if (options.sku || options.barcode) {
      const ids = await this.findProductIdsBySkuOrBarcode(options.sku, options.barcode);
      if (!ids?.length) {
        return {
          data: [],
          meta: buildPaginationMeta(0, page, limit),
        };
      }
      filter._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
    }

    if (options.q) {
      const q = options.q.trim();
      const skuMatch = await ProductVariantModel.find({
        isDeleted: false,
        $or: [
          { sku: new RegExp(escapeRegex(q), 'i') },
          { barcode: new RegExp(escapeRegex(q), 'i') },
        ],
      })
        .select('productId')
        .lean();

      const productIdsFromVariants = skuMatch.map((v) => v.productId);

      filter.$or = [
        { name: new RegExp(escapeRegex(q), 'i') },
        { slug: new RegExp(escapeRegex(q), 'i') },
        { shortDescription: new RegExp(escapeRegex(q), 'i') },
        { tags: new RegExp(escapeRegex(q), 'i') },
        { searchKeywords: new RegExp(escapeRegex(q), 'i') },
        ...(productIdsFromVariants.length ? [{ _id: { $in: productIdsFromVariants } }] : []),
      ];
    }

    const sort = parseSort(options, this.sortableFields);
    const skip = getPaginationSkip(page, limit);

    const [data, total] = await Promise.all([
      ProductModel.find(filter as FilterQuery<ProductDocument>)
        .select(
          [
            'name',
            'slug',
            'shortDescription',
            'status',
            'visibility',
            'pricing',
            'brandId',
            'categoryId',
            'gender',
            'isFeatured',
            'isTrending',
            'isNewArrival',
            'isBestSeller',
            'isClearance',
            'averageRating',
            'reviewCount',
            'defaultVariantId',
            'variantCount',
            'sku',
            'createdAt',
            'updatedAt',
          ].join(' '),
        )
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter as FilterQuery<ProductDocument>),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toObjectId(value?: string): Types.ObjectId | undefined {
  if (!value || typeof value !== 'string') return undefined;
  if (!Types.ObjectId.isValid(value)) return undefined;
  return new Types.ObjectId(value);
}

export const productRepository = new ProductRepository();
