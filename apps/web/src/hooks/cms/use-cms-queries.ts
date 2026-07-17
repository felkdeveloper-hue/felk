import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { cmsApi } from '@/services/sdk';
import type {
  Announcement,
  Brand,
  CmsPage,
  Collection,
  ContactInfo,
  Faq,
  HeroBanner,
  HomeSection,
  PromoBanner,
  PublicSettings,
  SocialLink,
} from '@/services/sdk/cms';
import type { AppError } from '@/lib/errors';

const CMS_STALE = 1000 * 60 * 5;
const CMS_GC = 1000 * 60 * 30;

type CmsQueryOptions<T> = Omit<UseQueryOptions<T, AppError>, 'queryKey' | 'queryFn'>;

export function usePublicSettings(options?: CmsQueryOptions<PublicSettings>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.settingsPublic(),
    queryFn: () => cmsApi.getPublicSettings(),
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useCmsPage(slug: string, options?: CmsQueryOptions<CmsPage | null>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.page(slug),
    queryFn: () => cmsApi.getPageBySlug(slug),
    enabled: Boolean(slug),
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useCmsPages(options?: CmsQueryOptions<{ data: CmsPage[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.pages({ published: true }),
    queryFn: async () => {
      const result = await cmsApi.listPages({ status: 'published', limit: 100 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useHeroBanners(options?: CmsQueryOptions<{ data: HeroBanner[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.heroBanners({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listHeroBanners({ status: 'active', limit: 10 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useAnnouncements(options?: CmsQueryOptions<{ data: Announcement[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.announcements({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listAnnouncements({ status: 'active', limit: 5 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useHomeSections(options?: CmsQueryOptions<{ data: HomeSection[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.homeSections({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listHomeSections({ status: 'active', limit: 50 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function usePromoBanners(
  placement?: string,
  options?: CmsQueryOptions<{ data: PromoBanner[] }>,
) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.promoBanners({ placement }),
    queryFn: async () => {
      const result = await cmsApi.listPromoBanners({
        status: 'active',
        limit: 10,
        ...(placement ? { placement } : {}),
      });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useFaqs(limit = 6, options?: CmsQueryOptions<{ data: Faq[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.faqs({ limit }),
    queryFn: async () => {
      const result = await cmsApi.listFaqs({ status: 'active', limit });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useBrands(options?: CmsQueryOptions<{ data: Brand[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.brands({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listBrands({ status: 'active', limit: 24 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useCollections(options?: CmsQueryOptions<{ data: Collection[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.collections({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listCollections({ status: 'active', limit: 12 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useSocialLinks(options?: CmsQueryOptions<{ data: SocialLink[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.socialLinks({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listSocialLinks({ status: 'active', limit: 20 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export function useContactInfos(options?: CmsQueryOptions<{ data: ContactInfo[] }>) {
  return useQuery({
    queryKey: QUERY_KEYS.cms.contactInfos({ active: true }),
    queryFn: async () => {
      const result = await cmsApi.listContactInfos({ status: 'active', limit: 20 });
      return { data: result.data };
    },
    staleTime: CMS_STALE,
    gcTime: CMS_GC,
    ...options,
  });
}

export type CmsQueryResult<T> = UseQueryResult<T, AppError>;
