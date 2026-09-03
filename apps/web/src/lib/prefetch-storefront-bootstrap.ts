import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { prefetchDefaultCatalogLists } from '@/lib/prefetch-catalog';
import { storefrontApi, type StorefrontBootstrapPayload } from '@/services/sdk/storefront';
import type { CatalogFacet } from '@/services/sdk/catalog-facets';
import { normalizeCategory } from '@/utils/catalog/normalize';
import {
  activeOnly,
  mapList,
  normalizeAnnouncement,
  normalizeBrand,
  normalizeCmsPage,
  normalizeCollection,
  normalizeContactInfo,
  normalizeHeroBanner,
  normalizeHomeSection,
  normalizePromoBanner,
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

function facetPage<T>(rows: T[]) {
  return {
    data: rows,
    meta: {
      page: 1,
      limit: 100,
      total: rows.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

function normalizeFacetRow(raw: unknown): CatalogFacet {
  const record = raw as Record<string, unknown>;
  return {
    id: String(record.id ?? record._id ?? ''),
    name: String(record.name ?? record.label ?? ''),
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : undefined,
  };
}

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

    // Promo + facet masters — eliminate home promo fan-out and filter-sheet waterfall.
    if (payload.promoBanners) {
      const allPromos = mapList(payload.promoBanners, normalizePromoBanner);
      queryClient.setQueryData(
        QUERY_KEYS.cms.promoBanners({}),
        { data: allPromos },
        {
          updatedAt: now,
        },
      );
      for (const placement of [
        'home_split',
        'home_editorial',
        'home_after_best_sellers',
        'home_lookbook_videos',
        'home_before_featured',
        'contact_page',
      ] as const) {
        queryClient.setQueryData(
          QUERY_KEYS.cms.promoBanners({ placement }),
          { data: allPromos.filter((banner) => banner.placement === placement) },
          { updatedAt: now },
        );
      }
    }

    if (payload.brands) {
      queryClient.setQueryData(
        QUERY_KEYS.cms.brands({ active: true }),
        facetPage(mapList(payload.brands, normalizeBrand)),
        { updatedAt: now },
      );
    }
    if (payload.collections) {
      queryClient.setQueryData(
        QUERY_KEYS.cms.collections({ active: true }),
        facetPage(mapList(payload.collections, normalizeCollection)),
        { updatedAt: now },
      );
    }
    if (payload.colors) {
      queryClient.setQueryData(
        ['catalog', 'facets', 'colors'],
        facetPage(mapList(payload.colors, normalizeFacetRow)),
        { updatedAt: now },
      );
    }
    if (payload.sizes) {
      queryClient.setQueryData(
        ['catalog', 'facets', 'sizes'],
        facetPage(mapList(payload.sizes, normalizeFacetRow)),
        { updatedAt: now },
      );
    }
    if (payload.materials) {
      queryClient.setQueryData(
        ['catalog', 'facets', 'materials'],
        facetPage(mapList(payload.materials, normalizeFacetRow)),
        { updatedAt: now },
      );
    }
    if (payload.occasions) {
      queryClient.setQueryData(
        ['catalog', 'facets', 'occasions'],
        facetPage(mapList(payload.occasions, normalizeFacetRow)),
        { updatedAt: now },
      );
    }

    // Warm the default Women PLP while the user is still on home / layout chrome.
    prefetchDefaultCatalogLists(queryClient);
  } catch {
    // Individual hooks fall back to their own requests.
  }
}
