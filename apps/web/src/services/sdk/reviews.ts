import { http } from '@/lib/http-client';
import { mapList } from '@/utils/cms';

export interface ReviewImage {
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerId: string;
  orderId: string;
  rating: number;
  title?: string | null;
  body: string;
  images: ReviewImage[];
  status: string;
  isVerifiedPurchase: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  recommendRate: number;
  distribution: Record<number, number>;
  customerImages: Array<ReviewImage & { rating?: number }>;
}

export interface ReviewEligibility {
  eligible: boolean;
  reason?: string;
  orderId?: string;
  orderNumber?: string;
}

export interface ReviewCreatePayload {
  orderId: string;
  rating: number;
  title?: string;
  body: string;
  images?: ReviewImage[];
}

function idOf(record: Record<string, unknown>): string {
  if (typeof record.id === 'string') return record.id;
  if (record._id != null) return String(record._id);
  return '';
}

function normalizeReview(raw: unknown): ProductReview {
  const record = raw as Record<string, unknown>;
  return {
    id: idOf(record),
    productId: String(record.productId ?? ''),
    customerId: String(record.customerId ?? ''),
    orderId: String(record.orderId ?? ''),
    rating: Number(record.rating ?? 0),
    title: typeof record.title === 'string' ? record.title : null,
    body: String(record.body ?? ''),
    images: Array.isArray(record.images) ? (record.images as ReviewImage[]) : [],
    status: String(record.status ?? 'pending'),
    isVerifiedPurchase: Boolean(record.isVerifiedPurchase),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

export const reviewsApi = {
  async listForProduct(productId: string, params?: { page?: number; limit?: number }) {
    const response = await http.get<{ items: unknown[]; summary: ReviewSummary }>(
      `/products/${productId}/reviews`,
      { params },
    );
    return {
      items: mapList(response.items ?? [], normalizeReview),
      summary: response.summary,
    };
  },

  async eligibility(productId: string): Promise<ReviewEligibility> {
    return http.get<ReviewEligibility>(`/products/${productId}/reviews/eligibility`);
  },

  async create(productId: string, payload: ReviewCreatePayload): Promise<ProductReview> {
    return normalizeReview(await http.post<unknown>(`/products/${productId}/reviews`, payload));
  },

  async uploadImages(productId: string, files: File[]): Promise<ReviewImage[]> {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return http.post<ReviewImage[]>(`/products/${productId}/reviews/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
