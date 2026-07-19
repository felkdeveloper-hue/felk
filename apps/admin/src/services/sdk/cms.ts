import { http } from '@/lib/http-client';
import { normalizeId, normalizeList } from '@/lib/utils';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface CmsResource {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

function normalizeCmsResource(raw: unknown): CmsResource {
  const record = raw as Record<string, unknown>;
  return {
    id: normalizeId(record),
    name: String(record.name ?? record.title ?? record.question ?? ''),
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
    ...record,
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

export const cmsApi = {
  categories: createCmsResourceApi('/cms/categories'),
  brands: createCmsResourceApi('/cms/brands'),
  collections: createCmsResourceApi('/cms/collections'),
  sizes: createCmsResourceApi('/cms/sizes'),
  occasions: createCmsResourceApi('/cms/occasions'),
  pages: createCmsResourceApi('/cms/pages'),
  heroBanners: createCmsResourceApi('/cms/hero-banners'),
  promoBanners: createCmsResourceApi('/cms/promo-banners'),
  homeSections: createCmsResourceApi('/cms/home-sections'),
  faqs: createCmsResourceApi('/cms/faqs'),
};
