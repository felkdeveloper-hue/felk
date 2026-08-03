import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { PRODUCT_LIST_STALE_MS } from '@/lib/prefetch-catalog';
import { productsApi, type Product } from '@/services/sdk';
import {
  applyClientCatalogFilters,
  catalogSearchToProductParams,
  CATALOG_BATCH_SIZE,
  CATALOG_MAX_PRODUCTS,
  type CatalogSearchState,
} from '@/utils/catalog';

function forEachCachedProduct(
  queryClient: ReturnType<typeof useQueryClient>,
  visit: (product: Product) => boolean,
): Product | undefined {
  const matches = queryClient.getQueriesData<unknown>({
    queryKey: QUERY_KEYS.products.all(),
  });
  for (const [, value] of matches) {
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray((value as { data?: Product[] }).data)) {
      for (const product of (value as { data: Product[] }).data) {
        if (visit(product)) return product;
      }
    }
    if (Array.isArray((value as { pages?: Array<{ data?: Product[] }> }).pages)) {
      for (const page of (value as { pages: Array<{ data?: Product[] }> }).pages) {
        for (const product of page.data ?? []) {
          if (visit(product)) return product;
        }
      }
    }
  }
  return undefined;
}

function findProductInListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
): Product | undefined {
  return forEachCachedProduct(queryClient, (product) => product.slug === slug);
}

function findProductInListCacheById(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
): Product | undefined {
  return forEachCachedProduct(queryClient, (product) => product.id === id);
}

export function useProductsList(state: CatalogSearchState, options?: { enabled?: boolean }) {
  const apiParams = catalogSearchToProductParams(state);

  return useQuery({
    queryKey: QUERY_KEYS.products.list({ ...apiParams, client: state }),
    queryFn: async () => {
      const result = await productsApi.list(apiParams);
      return {
        ...result,
        data: applyClientCatalogFilters(result.data, state),
      };
    },
    enabled: options?.enabled ?? true,
    staleTime: PRODUCT_LIST_STALE_MS,
    gcTime: 1000 * 60 * 30,
  });
}

export function useInfiniteProducts(state: CatalogSearchState, options?: { enabled?: boolean }) {
  const baseParams = catalogSearchToProductParams({
    ...state,
    page: undefined,
    limit: CATALOG_BATCH_SIZE,
  });

  return useInfiniteQuery({
    queryKey: QUERY_KEYS.products.list({
      ...baseParams,
      infinite: true,
      max: CATALOG_MAX_PRODUCTS,
      client: state,
    }),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const result = await productsApi.list({ ...baseParams, page: pageParam });
      return {
        ...result,
        data: applyClientCatalogFilters(result.data, state),
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (loaded >= CATALOG_MAX_PRODUCTS) return undefined;
      if (!lastPage.meta.hasNextPage) return undefined;
      return lastPage.meta.page + 1;
    },
    enabled: options?.enabled ?? true,
    staleTime: PRODUCT_LIST_STALE_MS,
    gcTime: 1000 * 60 * 30,
    // Extra retries for cold starts / brief API blips — UI keeps skeleton until done.
    retry: 2,
    retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 4_000),
  });
}

export function useProductDetail(slug: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: QUERY_KEYS.products.detail(slug),
    queryFn: () => productsApi.getBySlugOrId(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
    placeholderData: () => findProductInListCache(queryClient, slug),
  });
}

export function useProductById(id: string, options?: { initialProduct?: Product }) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: QUERY_KEYS.products.detail(id),
    queryFn: () => productsApi.getById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    // Paint from the card / list cache immediately; enrich when detail arrives.
    placeholderData: () =>
      queryClient.getQueryData<Product>(QUERY_KEYS.products.detail(id)) ??
      options?.initialProduct ??
      findProductInListCacheById(queryClient, id),
  });
}

export function useRelatedProducts(productId: string, type = 'related') {
  return useQuery({
    queryKey: QUERY_KEYS.products.relationships(productId, type),
    queryFn: () => productsApi.listRelationships(productId, type),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6_000),
  });
}
