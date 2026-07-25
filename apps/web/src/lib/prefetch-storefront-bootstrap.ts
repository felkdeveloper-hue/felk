import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { storefrontApi, type StorefrontBootstrapPayload } from '@/services/sdk/storefront';
import { normalizeCategory } from '@/utils/catalog/normalize';
import {
  activeOnly,
  mapList,
  normalizeAnnouncement,
  normalizeCmsPage,
  normalizeContactInfo,
  normalizeHeroBanner,
  normalizeHomeSection,
  normalizePublicSettings,
  normalizeSocialLink,
  sortByPriority,
} from '@/utils/cms';

/**
 * Shared in-flight request. `main.tsx` and the public layout both warm this
 * cache, and on a cold backend the call can stay open for a while — without
 * this guard they would each issue their own duplicate request.
 */
let inFlight: Promise<void> | null = null;

/**
 * Fetches `/storefront/bootstrap` once and seeds individual React Query
 * caches so layout + homepage hooks resolve without N parallel round-trips.
 *
 * Callers should not await this on a render-blocking path: it is a cache warm,
 * and every consuming hook can fetch its own data if it never resolves.
 */
export function prefetchStorefrontBootstrap(queryClient: QueryClient): Promise<void> {
  if (queryClient.getQueryData(QUERY_KEYS.storefront.bootstrap())) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = runPrefetch(queryClient).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runPrefetch(queryClient: QueryClient): Promise<void> {
  try {
    const payload: StorefrontBootstrapPayload = await storefrontApi.getBootstrap();
    const now = Date.now();
    queryClient.setQueryData(QUERY_KEYS.storefront.bootstrap(), payload, { updatedAt: now });
    queryClient.setQueryData(
      QUERY_KEYS.cms.settingsPublic(),
      normalizePublicSettings(payload.settings),
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.categories.list({ active: true }),
      {
        data: mapList(payload.categories, normalizeCategory),
        meta: {
          page: 1,
          limit: 100,
          total: payload.categories.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.cms.heroBanners({ active: true }),
      { data: sortByPriority(activeOnly(mapList(payload.heroBanners, normalizeHeroBanner))) },
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.cms.homeSections({ active: true }),
      {
        data: activeOnly(mapList(payload.homeSections, normalizeHomeSection)).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        ),
      },
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.cms.announcements({ active: true }),
      { data: sortByPriority(activeOnly(mapList(payload.announcements, normalizeAnnouncement))) },
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.cms.socialLinks({ active: true }),
      { data: activeOnly(mapList(payload.socialLinks, normalizeSocialLink)) },
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.cms.contactInfos({ active: true }),
      { data: activeOnly(mapList(payload.contactInfos, normalizeContactInfo)) },
      { updatedAt: now },
    );
    queryClient.setQueryData(
      QUERY_KEYS.cms.pages({ published: true }),
      { data: mapList(payload.pages, normalizeCmsPage) },
      { updatedAt: now },
    );
  } catch {
    // Individual hooks fall back to their own requests.
  }
}
