import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface AdminReview {
  id: string;
  productId: string;
  customerId: string;
  orderId: string;
  rating: number;
  title?: string | null;
  body: string;
  images: Array<{ url: string; thumbnailUrl?: string | null; alt?: string | null }>;
  status: string;
  isVerifiedPurchase: boolean;
  createdAt?: string;
}

function normalizeReview(raw: unknown): AdminReview {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record),
    productId: String(record.productId ?? ''),
    customerId: String(record.customerId ?? ''),
    orderId: String(record.orderId ?? ''),
    rating: Number(record.rating ?? 0),
    title: typeof record.title === 'string' ? record.title : null,
    body: String(record.body ?? ''),
    images: Array.isArray(record.images) ? (record.images as AdminReview['images']) : [],
    status: String(record.status ?? 'pending'),
    isVerifiedPurchase: Boolean(record.isVerifiedPurchase),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
  };
}

export interface ReviewListParams extends ListQueryParams {
  status?: string;
  productId?: string;
}

export const reviewsApi = {
  async list(params?: ReviewListParams): Promise<PaginatedResult<AdminReview>> {
    const result = await http.getPaginated<unknown>('/reviews', { params });
    return { ...result, data: normalizeList(result.data, normalizeReview) };
  },

  async moderate(id: string, status: 'approved' | 'rejected', note?: string): Promise<AdminReview> {
    return normalizeReview(await http.patch<unknown>(`/reviews/${id}`, { status, note }));
  },
};
