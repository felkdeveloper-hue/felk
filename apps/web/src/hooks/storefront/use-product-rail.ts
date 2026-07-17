import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';
import type { ProductListParams } from '@/services/sdk';

const PRODUCT_STALE = 1000 * 60 * 2;

export type ProductRailKind = 'trending' | 'best-sellers' | 'new-arrivals';

const railParams: Record<ProductRailKind, ProductListParams> = {
  trending: {
    status: 'active',
    isTrending: true,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 8,
  },
  'best-sellers': {
    status: 'active',
    isBestSeller: true,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 8,
  },
  'new-arrivals': {
    status: 'active',
    isNewArrival: true,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 8,
  },
};

export function useProductRail(kind: ProductRailKind) {
  const params = railParams[kind];

  return useQuery({
    queryKey: QUERY_KEYS.products.list({ rail: kind, ...params }),
    queryFn: () => productsApi.list(params),
    staleTime: PRODUCT_STALE,
    retry: 1,
  });
}
