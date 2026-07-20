import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';

export interface ProductMediaRow {
  id: string;
  productId: string;
  variantId?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  alt?: string;
  isPrimary: boolean;
  isGallery: boolean;
  priority: number;
}

function normalizeMedia(raw: unknown): ProductMediaRow {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record),
    productId: String(record.productId ?? ''),
    variantId: record.variantId ? String(record.variantId) : null,
    url: String(record.url ?? ''),
    thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : null,
    alt: typeof record.alt === 'string' ? record.alt : undefined,
    isPrimary: Boolean(record.isPrimary),
    isGallery: record.isGallery !== false,
    priority: Number(record.priority ?? 0),
  };
}

export interface MediaUploadOptions {
  variantId?: string;
  isPrimary?: boolean;
  alt?: string;
}

export const mediaApi = {
  async list(productId: string): Promise<ProductMediaRow[]> {
    const rows = await http.get<unknown[]>(`/catalog/products/${productId}/media`);
    return normalizeList(rows, normalizeMedia);
  },

  async upload(
    productId: string,
    file: File,
    options?: MediaUploadOptions,
  ): Promise<ProductMediaRow> {
    const form = new FormData();
    form.append('file', file);
    if (options?.variantId) form.append('variantId', options.variantId);
    if (options?.isPrimary) form.append('isPrimary', 'true');
    if (options?.alt) form.append('alt', options.alt);

    return normalizeMedia(
      await http.post<unknown>(`/catalog/products/${productId}/media/upload`, form),
    );
  },

  async setPrimary(mediaId: string): Promise<ProductMediaRow> {
    return normalizeMedia(
      await http.patch<unknown>(`/catalog/media/${mediaId}`, { isPrimary: true }),
    );
  },

  async remove(mediaId: string): Promise<void> {
    await http.delete(`/catalog/media/${mediaId}`);
  },
};
