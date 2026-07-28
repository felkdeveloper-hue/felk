import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { prefetchDefaultCatalogLists } from '@/lib/prefetch-catalog';
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
    const categories = mapList(payload.categories, normalizeCategory);
    queryClient.setQueryData(
      QUERY_KEYS.categories.list({ active: true }),
      {
        data: categories,
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
    // Seed slug lookups so category PLPs can resolve id synchronously and start
    // the product list without a categories waterfall.
    for (const category of categories) {
      if (!category.slug) continue;
      queryClient.setQueryData(QUERY_KEYS.categories.detail(category.slug), category, {
        updatedAt: now,
      });
    }
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

    // Warm the default Women PLP while the user is still on home / layout chrome.
    prefetchDefaultCatalogLists(queryClient);
  } catch {
    // Individual hooks fall back to their own requests.
  }
}
