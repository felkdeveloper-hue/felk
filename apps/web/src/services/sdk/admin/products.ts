import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  status: string;
  visibility?: string;
  price?: number;
  salePrice?: number;
  currency?: string;
  brandName?: string;
  brandId?: string;
  categoryId?: string;
  gender?: string;
  occasionIds?: string[];
  shortDescription?: string;
  description?: string;
  variantCount?: number;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminVariant {
  id: string;
  productId: string;
  sku: string;
  title?: string;
  price: number;
  salePrice?: number | null;
  costPrice?: number | null;
  currency?: string;
  status?: string;
  isDefault?: boolean;
}

export interface VariantInput {
  sku?: string;
  title?: string;
  price: number;
  salePrice?: number | null;
  costPrice?: number | null;
  currency?: string;
  status?: string;
  isDefault?: boolean;
}

function readMoneyAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'amount' in value) {
    const amount = Number((value as { amount?: unknown }).amount);
    return Number.isFinite(amount) ? amount : undefined;
  }
  return undefined;
}

function normalizeProduct(raw: unknown): AdminProduct {
  const record = raw as Record<string, unknown>;
  const pricing =
    record.pricing && typeof record.pricing === 'object'
      ? (record.pricing as Record<string, unknown>)
      : undefined;
  const price = readMoneyAmount(record.price) ?? readMoneyAmount(pricing?.price) ?? 0;
  const salePrice =
    readMoneyAmount(record.salePrice) ?? readMoneyAmount(pricing?.salePrice) ?? undefined;
  return {
    id: normalizeId(record),
    name: String(record.name ?? ''),
    slug: String(record.slug ?? ''),
    sku: typeof record.sku === 'string' ? record.sku : undefined,
    status: String(record.status ?? 'draft'),
    visibility: typeof record.visibility === 'string' ? record.visibility : undefined,
    price,
    salePrice,
    currency:
      typeof record.currency === 'string'
        ? record.currency
        : typeof pricing?.currency === 'string'
          ? pricing.currency
          : 'LKR',
    brandName: typeof record.brandName === 'string' ? record.brandName : undefined,
    brandId: record.brandId ? String(record.brandId) : undefined,
    categoryId: record.categoryId ? String(record.categoryId) : undefined,
    gender: typeof record.gender === 'string' ? record.gender : undefined,
    occasionIds: Array.isArray(record.occasionIds)
      ? record.occasionIds.map((id) => String(id))
      : undefined,
    shortDescription:
      typeof record.shortDescription === 'string' ? record.shortDescription : undefined,
    description: typeof record.description === 'string' ? record.description : undefined,
    variantCount: Number(record.variantCount ?? 0),
    thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

function normalizeVariant(raw: unknown): AdminVariant {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record),
    productId: String(record.productId ?? ''),
    sku: String(record.sku ?? ''),
    title: typeof record.title === 'string' ? record.title : undefined,
    price: Number(record.price ?? 0),
    salePrice: record.salePrice == null ? null : Number(record.salePrice),
    costPrice: record.costPrice == null ? null : Number(record.costPrice),
    currency: typeof record.currency === 'string' ? record.currency : 'LKR',
    status: typeof record.status === 'string' ? record.status : undefined,
    isDefault: Boolean(record.isDefault),
  };
}

export interface ProductListParams extends ListQueryParams {
  status?: string;
  brandId?: string;
  categoryId?: string;
  includeDeleted?: boolean;
}

export interface ProductInput {
  name: string;
  slug?: string;
  sku?: string;
  status?: string;
  shortDescription?: string;
  description?: string;
  brandId?: string;
  categoryId?: string;
  gender?: string;
  occasionIds?: string[];
  price?: number;
  salePrice?: number | null;
  currency?: string;
  pricing?: {
    price: number;
    salePrice?: number | null;
    currency?: string;
  };
}

export const productsApi = {
  async list(params?: ProductListParams): Promise<PaginatedResult<AdminProduct>> {
    const result = await http.getPaginated<unknown>('/catalog/products', { params });
    return { ...result, data: normalizeList(result.data, normalizeProduct) };
  },

  async getById(id: string): Promise<AdminProduct> {
    return normalizeProduct(await http.get<unknown>(`/catalog/products/${id}`));
  },

  async create(payload: ProductInput): Promise<AdminProduct> {
    return normalizeProduct(await http.post<unknown>('/catalog/products', payload));
  },

  async update(id: string, payload: Partial<ProductInput>): Promise<AdminProduct> {
    return normalizeProduct(await http.patch<unknown>(`/catalog/products/${id}`, payload));
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/catalog/products/${id}`);
  },

  async publish(id: string): Promise<AdminProduct> {
    return normalizeProduct(await http.post<unknown>(`/catalog/products/${id}/publish`));
  },

  async duplicate(id: string): Promise<AdminProduct> {
    return normalizeProduct(await http.post<unknown>(`/catalog/products/${id}/duplicate`));
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await http.post('/catalog/products/bulk-delete', { ids });
  },

  async bulkStatus(ids: string[], status: string): Promise<void> {
    await http.post('/catalog/products/bulk-status', { ids, status });
  },

  async listVariants(productId: string): Promise<AdminVariant[]> {
    const rows = await http.get<unknown[]>(`/catalog/products/${productId}/variants`);
    return normalizeList(rows, normalizeVariant);
  },

  async createVariant(productId: string, payload: VariantInput): Promise<AdminVariant> {
    return normalizeVariant(
      await http.post<unknown>(`/catalog/products/${productId}/variants`, payload),
    );
  },

  async updateVariant(variantId: string, payload: Partial<VariantInput>): Promise<AdminVariant> {
    return normalizeVariant(await http.patch<unknown>(`/catalog/variants/${variantId}`, payload));
  },

  async removeVariant(variantId: string): Promise<void> {
    await http.delete(`/catalog/variants/${variantId}`);
  },
};
