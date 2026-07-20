import { useQueries } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';

export function useRecentlyViewedProducts(ids: string[], excludeId?: string) {
  const filteredIds = ids.filter((id) => id !== excludeId).slice(0, 8);

  const queries = useQueries({
    queries: filteredIds.map((id) => ({
      queryKey: QUERY_KEYS.products.detail(id),
      queryFn: () => productsApi.getById(id),
      enabled: Boolean(id),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const products = queries
    .map((q) => q.data)
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const isLoading = queries.some((q) => q.isLoading);

  return { products, isLoading };
}
