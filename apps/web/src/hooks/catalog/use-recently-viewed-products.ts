import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';

export function useRecentlyViewedProducts(ids: string[], excludeId?: string) {
  const filteredIds = ids.filter((id) => id !== excludeId).slice(0, 8);

  const query = useQuery({
    queryKey: QUERY_KEYS.products.list({ recentlyViewed: filteredIds }),
    queryFn: () => productsApi.listByIds(filteredIds),
    enabled: filteredIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
  };
}
