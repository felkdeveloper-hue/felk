import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';
import {
  applyClientCatalogFilters,
  catalogSearchToProductParams,
  CATALOG_BATCH_SIZE,
  CATALOG_MAX_PRODUCTS,
  type CatalogSearchState,
} from '@/utils/catalog';

const PRODUCT_LIST_STALE_MS = 1000 * 60 * 10;

function infiniteListKey(state: CatalogSearchState) {
  const baseParams = catalogSearchToProductParams({
    ...state,
    page: undefined,
    limit: CATALOG_BATCH_SIZE,
  });
  return {
    baseParams,
    queryKey: QUERY_KEYS.products.list({
      ...baseParams,
      infinite: true,
      max: CATALOG_MAX_PRODUCTS,
      client: state,
    }),
  };
}

/** Prefetch the first infinite-scroll page for a catalog PLP. */
export function prefetchInfiniteProducts(
  queryClient: QueryClient,
  state: CatalogSearchState,
): Promise<void> {
  const { baseParams, queryKey } = infiniteListKey(state);
  if (queryClient.getQueryData(queryKey)) return Promise.resolve();

  return queryClient
    .prefetchInfiniteQuery({
      queryKey,
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        const result = await productsApi.list({ ...baseParams, page: pageParam });
        return {
          ...result,
          data: applyClientCatalogFilters(result.data, state),
        };
      },
      getNextPageParam: (lastPage) => {
        if (!lastPage.meta.hasNextPage) return undefined;
        return lastPage.meta.page + 1;
      },
      staleTime: PRODUCT_LIST_STALE_MS,
      pages: 1,
    })
    .then(() => undefined);
}

/**
 * After bootstrap seeds categories, warm the most common shop lists so the
 * first navigation off the homepage does not wait on a cold Render round-trip.
 */
export function prefetchDefaultCatalogLists(queryClient: QueryClient): void {
  void prefetchInfiniteProducts(queryClient, { gender: 'women' });
}

export { PRODUCT_LIST_STALE_MS };
