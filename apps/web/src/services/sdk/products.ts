import { http } from '@/lib/http-client';
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
  subcategoryId?: string;
  collectionIds?: string[];
  materialId?: string;
  occasionIds?: string[];
  tags?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isClearance?: boolean;
  averageRating?: number;
  reviewCount?: number;
  defaultVariantId?: string;
  variantCount?: number;
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
  brandId?: string;
  categoryId?: string;
  subcategoryId?: string;
  collectionId?: string;
  tag?: string;
  tags?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  gender?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isClearance?: boolean;
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
    const result = await this.list({ q: slug, limit: 50, status: 'active' });
    const match = result.data.find((product) => product.slug === slug);
    if (!match) return null;
    return this.getById(match.id);
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
