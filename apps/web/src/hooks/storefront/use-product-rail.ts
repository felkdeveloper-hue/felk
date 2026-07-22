import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { productsApi } from '@/services/sdk';
import type { Product, ProductListParams } from '@/services/sdk';
import type { PaginatedResult } from '@/types';

const PRODUCT_STALE = 1000 * 60 * 3;
const RANDOM_PICK = 8;

export type ProductRailKind = 'trending' | 'best-sellers' | 'new-arrivals' | 'random';

export interface ProductRailScope {
  categoryId?: string;
  gender?: string;
  /** Newest uploads by `createdAt` (ignore `isNewArrival` flag). */
  newestUploads?: boolean;
}

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
  random: {
    status: 'active',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 8,
  },
};

function buildRailParams(kind: ProductRailKind, scope?: ProductRailScope): ProductListParams {
  const base = { ...railParams[kind] };

  if (scope?.newestUploads && kind === 'new-arrivals') {
    delete base.isNewArrival;
    base.sortBy = 'createdAt';
    base.sortOrder = 'desc';
  }
  if (scope?.categoryId) base.categoryId = scope.categoryId;
  if (scope?.gender) base.gender = scope.gender;

  return base;
}

function shuffleProducts(products: Product[]): Product[] {
  const next = [...products];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function findCachedProductPage(queryClient: ReturnType<typeof useQueryClient>): Product[] {
  const matches = queryClient.getQueriesData<PaginatedResult<Product>>({
    queryKey: ['products', 'list'],
  });
  for (const [, value] of matches) {
    if (value?.data?.length) return value.data;
  }
  return [];
}

export function useProductRail(
  kind: ProductRailKind,
  scope?: ProductRailScope,
  options?: { enabled?: boolean },
) {
  const queryClient = useQueryClient();
  const categoryId = scope?.categoryId;
  const gender = scope?.gender;
  const newestUploads = scope?.newestUploads;

  const params = useMemo(
    () => buildRailParams(kind, { categoryId, gender, newestUploads }),
    [kind, categoryId, gender, newestUploads],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.products.list({ rail: kind, ...params }),
    queryFn: async () => {
      try {
        return await productsApi.list(params);
      } catch (error) {
        // Soft fallback: reuse any already-loaded catalog page so rails stay populated.
        const cached = findCachedProductPage(queryClient);
        if (cached.length) {
          return {
            data: cached.slice(0, params.limit ?? 8),
            meta: {
              page: 1,
              limit: params.limit ?? 8,
              total: cached.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          } satisfies PaginatedResult<Product>;
        }
        throw error;
      }
    },
    staleTime: PRODUCT_STALE,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
    enabled: options?.enabled ?? true,
  });

  const data = useMemo((): PaginatedResult<Product> | undefined => {
    if (!query.data) return undefined;
    if (kind !== 'random') return query.data;

    const picked = shuffleProducts(query.data.data).slice(0, RANDOM_PICK);
    return {
      ...query.data,
      data: picked,
      meta: {
        ...query.data.meta,
        page: 1,
        limit: RANDOM_PICK,
        total: picked.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }, [kind, query.data]);

  return { ...query, data };
}
