import { http } from '@/lib/http-client';
import {
  activeOnly,
  mapList,
  normalizeAnnouncement,
  normalizeBrand,
  normalizeCmsPage,
  normalizeCollection,
  normalizeContactInfo,
  normalizeFaq,
  normalizeHeroBanner,
  normalizeHomeSection,
  normalizePromoBanner,
  normalizePublicSettings,
  normalizeSocialLink,
  sortByPriority,
} from '@/utils/cms';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface PublicSettingRow {
  key: string;
  value: unknown;
  group?: string;
}

export interface PublicSettings {
  storeName?: string;
  currency?: string;
  contactEmail?: string;
  [key: string]: unknown;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  body?: string;
  excerpt?: string;
  featuredImageUrl?: string;
  seo?: Record<string, unknown>;
  status?: string;
  [key: string]: unknown;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  status?: string;
}

export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  ctaLabel?: string;
  priority?: number;
  status?: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  placement?: string;
  imageUrl?: string;
  linkUrl?: string;
  ctaLabel?: string;
  priority?: number;
  status?: string;
}

export interface Announcement {
  id: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  backgroundColor?: string;
  textColor?: string;
  priority?: number;
  status?: string;
}

export interface HomeSection {
  id: string;
  key: string;
  title?: string;
  subtitle?: string;
  type?: string;
  sortOrder?: number;
  config?: Record<string, unknown>;
  status?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  sortOrder?: number;
  status?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  status?: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: string;
  sortOrder?: number;
  status?: string;
}

export interface ContactInfo {
  id: string;
  label: string;
  type?: string;
  value: string;
  isPrimary?: boolean;
  sortOrder?: number;
  status?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  body?: string;
  publishedAt?: string;
  [key: string]: unknown;
}

const publishedParams = { status: 'active', limit: 50 } as const;

/** Typed SDK for storefront CMS content. */
export const cmsApi = {
  async getPublicSettings(): Promise<PublicSettings> {
    const raw = await http.get<PublicSettingRow[] | PublicSettings>('/cms/settings/public');
    return normalizePublicSettings(raw);
  },

  async listPages(params?: ListQueryParams): Promise<PaginatedResult<CmsPage>> {
    const result = await http.getPaginated<unknown>('/cms/pages', {
      params: { ...publishedParams, ...params },
    });
    return { ...result, data: mapList(result.data, normalizeCmsPage) };
  },

  async getPage(idOrSlug: string): Promise<CmsPage> {
    const doc = await http.get<unknown>(`/cms/pages/${idOrSlug}`);
    return normalizeCmsPage(doc);
  },

  async getPageBySlug(slug: string): Promise<CmsPage | null> {
    const result = await this.listPages({ search: slug, limit: 100, status: 'published' });
    return result.data.find((page) => page.slug === slug) ?? null;
  },

  async listFaqs(params?: ListQueryParams): Promise<PaginatedResult<Faq>> {
    const result = await http.getPaginated<unknown>('/storefront/faqs', {
      params: { ...publishedParams, ...params },
    });
    return { ...result, data: sortByPriority(activeOnly(mapList(result.data, normalizeFaq))) };
  },

  async listHeroBanners(params?: ListQueryParams): Promise<PaginatedResult<HeroBanner>> {
    const result = await http.getPaginated<unknown>('/storefront/hero-banners', {
      params: { ...publishedParams, sortBy: 'priority', sortOrder: 'desc', ...params },
    });
    return {
      ...result,
      data: sortByPriority(activeOnly(mapList(result.data, normalizeHeroBanner))),
    };
  },

  async listPromoBanners(params?: ListQueryParams): Promise<PaginatedResult<PromoBanner>> {
    const result = await http.getPaginated<unknown>('/storefront/promo-banners', {
      params: { ...publishedParams, sortBy: 'priority', sortOrder: 'desc', ...params },
    });
    return {
      ...result,
      data: sortByPriority(activeOnly(mapList(result.data, normalizePromoBanner))),
    };
  },

  async listAnnouncements(params?: ListQueryParams): Promise<PaginatedResult<Announcement>> {
    const result = await http.getPaginated<unknown>('/storefront/announcements', {
      params: { ...publishedParams, sortBy: 'priority', sortOrder: 'desc', ...params },
    });
    return {
      ...result,
      data: sortByPriority(activeOnly(mapList(result.data, normalizeAnnouncement))),
    };
  },

  async listHomeSections(params?: ListQueryParams): Promise<PaginatedResult<HomeSection>> {
    const result = await http.getPaginated<unknown>('/storefront/home-sections', {
      params: { ...publishedParams, sortBy: 'sortOrder', sortOrder: 'asc', ...params },
    });
    return {
      ...result,
      data: activeOnly(mapList(result.data, normalizeHomeSection)).sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    };
  },

  async listBrands(params?: ListQueryParams): Promise<PaginatedResult<Brand>> {
    const result = await http.getPaginated<unknown>('/storefront/brands', {
      params: { ...publishedParams, sortBy: 'sortOrder', sortOrder: 'asc', ...params },
    });
    return { ...result, data: activeOnly(mapList(result.data, normalizeBrand)) };
  },

  async listCollections(params?: ListQueryParams): Promise<PaginatedResult<Collection>> {
    const result = await http.getPaginated<unknown>('/storefront/collections', {
      params: { ...publishedParams, sortBy: 'sortOrder', sortOrder: 'asc', ...params },
    });
    return { ...result, data: activeOnly(mapList(result.data, normalizeCollection)) };
  },

  async listSocialLinks(params?: ListQueryParams): Promise<PaginatedResult<SocialLink>> {
    const result = await http.getPaginated<unknown>('/storefront/social-links', {
      params: { ...publishedParams, sortBy: 'sortOrder', sortOrder: 'asc', ...params },
    });
    return { ...result, data: activeOnly(mapList(result.data, normalizeSocialLink)) };
  },

  async listContactInfos(params?: ListQueryParams): Promise<PaginatedResult<ContactInfo>> {
    const result = await http.getPaginated<unknown>('/storefront/contact-infos', {
      params: { ...publishedParams, sortBy: 'sortOrder', sortOrder: 'asc', ...params },
    });
    return { ...result, data: activeOnly(mapList(result.data, normalizeContactInfo)) };
  },

  async listBlogCategories(params?: ListQueryParams): Promise<PaginatedResult<BlogCategory>> {
    return http.getPaginated<BlogCategory>('/cms/blog-categories', { params });
  },

  async listBlogs(params?: ListQueryParams): Promise<PaginatedResult<BlogPost>> {
    return http.getPaginated<BlogPost>('/cms/blogs', {
      params: { status: 'published', ...params },
    });
  },

  async getBlog(idOrSlug: string): Promise<BlogPost> {
    return http.get<BlogPost>(`/cms/blogs/${idOrSlug}`);
  },
};
