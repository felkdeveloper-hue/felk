import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';
import {
  applyClientCatalogFilters,
  catalogSearchToProductParams,
  CATALOG_BATCH_SIZE,
  CATALOG_MAX_PRODUCTS,
  type CatalogSearchState,
} from '@/utils/catalog';

export function useProductsList(state: CatalogSearchState) {
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
    staleTime: 1000 * 60 * 2,
    placeholderData: (previous) => previous,
  });
}

export function useInfiniteProducts(state: CatalogSearchState) {
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
    staleTime: 1000 * 60 * 2,
  });
}

export function useProductDetail(slug: string) {
  return useQuery({
    queryKey: QUERY_KEYS.products.detail(slug),
    queryFn: () => productsApi.getBySlugOrId(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.products.detail(id),
    queryFn: () => productsApi.getById(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRelatedProducts(productId: string, type = 'related') {
  return useQuery({
    queryKey: QUERY_KEYS.products.relationships(productId, type),
    queryFn: () => productsApi.listRelationships(productId, type),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 5,
  });
}
