import type { FilterQuery } from 'mongoose';
import { Types } from 'mongoose';
import { BaseRepository, type ListOptions } from '@/repositories/base.repository.js';
import {
  ProductModel,
  ProductVariantModel,
  type ProductDocument,
} from '@/models/product.models.js';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination.js';
import { parseSort } from '@/utils/sorting.js';

export interface ProductListFilters extends ListOptions {
  ids?: string | string[];
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
  colorId?: string;
  sizeId?: string;
  materialId?: string;
  occasionId?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isMoreToLove?: boolean;
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
    if (options.ids?.length) {
      const rawIds = Array.isArray(options.ids)
        ? options.ids
        : String(options.ids)
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);
      const objectIds = rawIds
        .map((id) => toObjectId(id))
        .filter((id): id is Types.ObjectId => Boolean(id));
      if (!objectIds.length) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      filter._id = { $in: objectIds };
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
      if (categoryId) {
        // Match primary category OR any entry in categoryIds (use $and so other $or filters still work)
        const categoryClause = {
          $or: [{ categoryId }, { categoryIds: categoryId }],
        };
        if (Array.isArray(filter.$and)) {
          (filter.$and as unknown[]).push(categoryClause);
        } else {
          filter.$and = [categoryClause];
        }
      }
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
    if (options.isFeatured !== undefined) filter.isFeatured = Boolean(options.isFeatured);
    if (options.isTrending !== undefined) filter.isTrending = Boolean(options.isTrending);
    if (options.isMoreToLove !== undefined) filter.isMoreToLove = Boolean(options.isMoreToLove);
    if (options.isNewArrival !== undefined) filter.isNewArrival = Boolean(options.isNewArrival);
    if (options.isBestSeller !== undefined) filter.isBestSeller = Boolean(options.isBestSeller);
    if (options.isClearance !== undefined) filter.isClearance = Boolean(options.isClearance);

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

    if (options.colorId || options.sizeId) {
      const variantFilter: Record<string, unknown> = {
        isDeleted: false,
        status: 'active',
      };
      const colorId = toObjectId(options.colorId);
      const sizeId = toObjectId(options.sizeId);
      if (options.colorId && !colorId) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      if (options.sizeId && !sizeId) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      if (colorId) variantFilter.colorId = colorId;
      if (sizeId) variantFilter.sizeId = sizeId;

      // distinct avoids loading every matching variant document into memory.
      const ids = (await ProductVariantModel.distinct('productId', variantFilter)).map((id) =>
        id.toString(),
      );
      if (!ids.length) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      const objectIds = ids.map((id) => new Types.ObjectId(id));
      if (filter._id && typeof filter._id === 'object' && '$in' in (filter._id as object)) {
        const existing = new Set(
          ((filter._id as { $in: Types.ObjectId[] }).$in ?? []).map((id) => id.toString()),
        );
        const intersected = objectIds.filter((id) => existing.has(id.toString()));
        if (!intersected.length) {
          return { data: [], meta: buildPaginationMeta(0, page, limit) };
        }
        filter._id = { $in: intersected };
      } else {
        filter._id = { $in: objectIds };
      }
    }

    if (options.occasionId) {
      const occasionId = toObjectId(options.occasionId);
      if (!occasionId) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      filter.occasionIds = occasionId;
    }

    if (options.materialId) {
      const materialId = toObjectId(options.materialId);
      if (!materialId) {
        return { data: [], meta: buildPaginationMeta(0, page, limit) };
      }
      filter.materialId = materialId;
    }

    if (options.q) {
      const q = options.q.trim();
      const looksLikeSku = /^[a-z0-9][a-z0-9_-]{2,40}$/i.test(q) && !/\s/.test(q);

      if (looksLikeSku) {
        // SKU / barcode / exact-ish codes: keep regex path (text index is poor for codes).
        const skuMatch = await ProductVariantModel.distinct('productId', {
          isDeleted: false,
          $or: [
            { sku: new RegExp(`^${escapeRegex(q)}$`, 'i') },
            { barcode: new RegExp(`^${escapeRegex(q)}$`, 'i') },
            { sku: new RegExp(escapeRegex(q), 'i') },
            { barcode: new RegExp(escapeRegex(q), 'i') },
          ],
        });

        filter.$or = [
          { name: new RegExp(escapeRegex(q), 'i') },
          { slug: new RegExp(escapeRegex(q), 'i') },
          { shortDescription: new RegExp(escapeRegex(q), 'i') },
          { tags: new RegExp(escapeRegex(q), 'i') },
          { searchKeywords: new RegExp(escapeRegex(q), 'i') },
          ...(skuMatch.length ? [{ _id: { $in: skuMatch } }] : []),
        ];
      } else {
        // Keyword search: use the existing text index (name/shortDescription/tags/searchKeywords).
        // Also OR in SKU hits via a cheap distinct — $text cannot live inside $or, so we
        // resolve to an _id union when SKU matches exist; otherwise filter with $text alone.
        const skuMatch = await ProductVariantModel.distinct('productId', {
          isDeleted: false,
          $or: [
            { sku: new RegExp(escapeRegex(q), 'i') },
            { barcode: new RegExp(escapeRegex(q), 'i') },
          ],
        });

        if (skuMatch.length) {
          const textHits = await ProductModel.find({
            ...filter,
            $text: { $search: q },
          })
            .select('_id')
            .limit(500)
            .lean();
          const merged = [
            ...new Set([
              ...textHits.map((row) => row._id.toString()),
              ...skuMatch.map((id) => id.toString()),
            ]),
          ].map((id) => new Types.ObjectId(id));
          if (!merged.length) {
            return { data: [], meta: buildPaginationMeta(0, page, limit) };
          }
          filter._id = { $in: merged };
        } else {
          filter.$text = { $search: q };
        }
      }
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
            'categoryIds',
            'gender',
            'isFeatured',
            'isTrending',
            'isMoreToLove',
            'isNewArrival',
            'isBestSeller',
            'isClearance',
            'averageRating',
            'reviewCount',
            'defaultVariantId',
            'variantCount',
            'sku',
            'materialId',
            'occasionIds',
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
