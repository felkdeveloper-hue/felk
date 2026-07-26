import { http } from '@/lib/http-client';
import { AppError } from '@/lib/errors';
import { mapList } from '@/utils/cms';
import {
  normalizeProduct,
  normalizeProductMedia,
  normalizeProductVariant,
} from '@/utils/catalog/normalize';
import type { PaginatedResult } from '@/types';

export interface ProductMoney {
  amount: number;
  currency: string;
}

export interface ProductPricingInsights {
  effectivePrice?: ProductMoney;
  isOnSale?: boolean;
  discountPercent?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  status: string;
  visibility?: string;
  price?: ProductMoney;
  salePrice?: ProductMoney;
  compareAtPrice?: ProductMoney;
  effectivePrice?: ProductMoney;
  isOnSale?: boolean;
  discountPercent?: number;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryIds?: string[];
  subcategoryId?: string;
  collectionIds?: string[];
  materialId?: string;
  gender?: string;
  ageGroup?: string;
  occasionIds?: string[];
  tags?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isMoreToLove?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isClearance?: boolean;
  paymentOption?: 'cod' | 'prepaid' | 'both';
  returnsAvailable?: boolean;
  returnsCriteria?: string;
  warrantyAvailable?: boolean;
  warrantyDetails?: string;
  averageRating?: number;
  reviewCount?: number;
  defaultVariantId?: string;
  variantCount?: number;
  /** When true, list/card add-to-cart should open the options drawer first. */
  requiresOptionSelection?: boolean;
  /** Listing color for this card (from the displayed variant). */
  colorId?: string;
  /** All color ids available on the product's variants. */
  colorIds?: string[];
  sizeIds?: string[];
  thumbnailUrl?: string;
  hoverImageUrl?: string;
  media?: ProductMedia[];
  variants?: ProductVariant[];
  relationships?: ProductRelationship[];
  specifications?: unknown[];
  attributeLinks?: unknown[];
  seo?: Record<string, unknown>;
  sku?: string;
  pricingInsights?: ProductPricingInsights;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title?: string;
  price?: ProductMoney;
  salePrice?: ProductMoney;
  compareAtPrice?: ProductMoney;
  colorId?: string;
  sizeId?: string;
  stock?: number;
  status?: string;
  thumbnailUrl?: string;
  isDefault?: boolean;
  /** When true this color/variant is surfaced as its own catalog listing with a custom title. */
  listSeparately?: boolean;
  optionValues?: Record<string, string>;
  [key: string]: unknown;
}

export interface ProductMedia {
  id: string;
  url: string;
  alt?: string;
  thumbnailUrl?: string;
  isPrimary?: boolean;
  priority?: number;
  type?: string;
  /** When set, this image belongs to a specific color/size SKU. */
  variantId?: string;
  [key: string]: unknown;
}

export interface ProductRelationship {
  id: string;
  relatedProductId: string;
  type: string;
  sortOrder?: number;
  relatedProduct?: Product;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  q?: string;
  status?: string;
  visibility?: string;
  /** Comma-separated or array of Mongo product ids. */
  ids?: string | string[];
  brandId?: string;
  categoryId?: string;
  categoryIds?: string[];
  subcategoryId?: string;
  collectionId?: string;
  tag?: string;
  tags?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  gender?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isMoreToLove?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isClearance?: boolean;
  colorId?: string;
  sizeId?: string;
  materialId?: string;
  occasionId?: string;
  sku?: string;
  barcode?: string;
  includeDeleted?: boolean;
}

/** Typed SDK for the storefront catalog (`/catalog/products`). */
export const productsApi = {
  async list(params?: ProductListParams): Promise<PaginatedResult<Product>> {
    const result = await http.getPaginated<unknown>('/storefront/products', { params });
    return { ...result, data: mapList(result.data, normalizeProduct) };
  },

  async getById(id: string): Promise<Product> {
    const doc = await http.get<unknown>(`/storefront/products/${id}`);
    return normalizeProduct(doc);
  },

  async getBySlug(slug: string): Promise<Product | null> {
    try {
      const doc = await http.get<unknown>(
        `/storefront/products/by-slug/${encodeURIComponent(slug)}`,
      );
      return normalizeProduct(doc);
    } catch (error) {
      if (AppError.isAppError(error) && (error.isUnauthorized || error.isForbidden)) {
        throw error;
      }
      // Fallback when the by-slug route is not deployed yet, or product missing.
      const result = await this.list({ q: slug, limit: 50, status: 'active' });
      const match = result.data.find((product) => product.slug === slug);
      if (!match) return null;
      return this.getById(match.id);
    }
  },

  /** Accepts a storefront slug or MongoDB product id (legacy cart links). */
  async getBySlugOrId(slugOrId: string): Promise<Product | null> {
    if (/^[a-f0-9]{24}$/i.test(slugOrId)) {
      try {
        return await this.getById(slugOrId);
      } catch {
        return null;
      }
    }
    return this.getBySlug(slugOrId);
  },

  /** Lightweight list fetch for a set of product ids (recently viewed, etc.). */
  async listByIds(ids: string[]): Promise<Product[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];
    const result = await this.list({
      ids: unique.join(','),
      limit: Math.min(unique.length, 24),
      status: 'active',
    });
    const byId = new Map(result.data.map((product) => [product.id, product]));
    return unique.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  },

  async listVariants(productId: string): Promise<ProductVariant[]> {
    const rows = await http.get<unknown[]>(`/storefront/products/${productId}/variants`);
    return mapList(rows, normalizeProductVariant);
  },

  async getVariant(variantId: string): Promise<ProductVariant> {
    const row = await http.get<unknown>(`/catalog/variants/${variantId}`);
    return normalizeProductVariant(row);
  },

  async listMedia(productId: string): Promise<ProductMedia[]> {
    const rows = await http.get<unknown[]>(`/storefront/products/${productId}/media`);
    return mapList(rows, normalizeProductMedia);
  },

  async listRelationships(productId: string, type?: string): Promise<ProductRelationship[]> {
    const rows = await http.get<unknown[]>(`/storefront/products/${productId}/relationships`, {
      params: type ? { type } : undefined,
    });
    return rows.map((row) => {
      const record = row as Record<string, unknown>;
      return {
        id: String(record.id ?? record._id ?? ''),
        relatedProductId: String(record.relatedProductId ?? ''),
        type: String(record.type ?? ''),
        sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : undefined,
        relatedProduct: record.relatedProduct ? normalizeProduct(record.relatedProduct) : undefined,
      };
    });
  },
};
