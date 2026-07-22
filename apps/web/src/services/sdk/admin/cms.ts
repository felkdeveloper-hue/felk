import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface CmsResource {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  imageUrl?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

function resolveImageUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const url = (raw as { url?: unknown }).url;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

function resolveResponsiveImageUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const images = raw as Record<string, unknown>;
  return (
    resolveImageUrl(images.desktop) ??
    resolveImageUrl(images.tablet) ??
    resolveImageUrl(images.mobile) ??
    resolveImageUrl(raw)
  );
}

function normalizeCmsResource(raw: unknown): CmsResource {
  const record = raw as Record<string, unknown>;
  return {
    ...record,
    id: normalizeId(record),
    name: String(record.name ?? record.title ?? record.question ?? ''),
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    imageUrl:
      resolveImageUrl(record.image) ??
      resolveImageUrl(record.logo) ??
      resolveResponsiveImageUrl(record.images),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

export function createCmsResourceApi(basePath: string) {
  return {
    async list(params?: ListQueryParams): Promise<PaginatedResult<CmsResource>> {
      const result = await http.getPaginated<unknown>(basePath, { params });
      return { ...result, data: normalizeList(result.data, normalizeCmsResource) };
    },

    async getById(id: string): Promise<CmsResource> {
      return normalizeCmsResource(await http.get<unknown>(`${basePath}/${id}`));
    },

    async create(payload: Record<string, unknown>): Promise<CmsResource> {
      return normalizeCmsResource(await http.post<unknown>(basePath, payload));
    },

    async update(id: string, payload: Record<string, unknown>): Promise<CmsResource> {
      return normalizeCmsResource(await http.patch<unknown>(`${basePath}/${id}`, payload));
    },

    async remove(id: string): Promise<void> {
      await http.delete(`${basePath}/${id}`);
    },
  };
}

function createBannerApi(basePath: string) {
  const api = createCmsResourceApi(basePath);
  return {
    ...api,
    async uploadImage(id: string, file: File, alt?: string): Promise<CmsResource> {
      const form = new FormData();
      form.append('file', file);
      if (alt) form.append('alt', alt);
      return normalizeCmsResource(await http.post<unknown>(`${basePath}/${id}/image`, form));
    },
  };
}

export const cmsApi = {
  categories: {
    ...createCmsResourceApi('/cms/categories'),
    async uploadImage(id: string, file: File, alt?: string): Promise<CmsResource> {
      const form = new FormData();
      form.append('file', file);
      if (alt) form.append('alt', alt);
      return normalizeCmsResource(await http.post<unknown>(`/cms/categories/${id}/image`, form));
    },
  },
  brands: createCmsResourceApi('/cms/brands'),
  collections: createCmsResourceApi('/cms/collections'),
  sizes: createCmsResourceApi('/cms/sizes'),
  occasions: createCmsResourceApi('/cms/occasions'),
  colors: createCmsResourceApi('/cms/colors'),
  materials: createCmsResourceApi('/cms/materials'),
  heroBanners: createBannerApi('/cms/hero-banners'),
  promoBanners: createBannerApi('/cms/promo-banners'),
};
