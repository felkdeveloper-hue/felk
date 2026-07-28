import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { categoriesApi, cmsApi, catalogFacetsApi, type Category } from '@/services/sdk';

type CategoriesListCache = { data: Category[] };

function findCategoryInListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
): Category | undefined {
  const cached = queryClient.getQueryData<CategoriesListCache>(
    QUERY_KEYS.categories.list({ active: true }),
  );
  return cached?.data.find((category) => category.slug === slug);
}

export function useCategoryTree() {
  return useQuery({
    queryKey: QUERY_KEYS.categories.tree(),
    queryFn: () => categoriesApi.tree(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCategoriesList() {
  return useQuery({
    queryKey: QUERY_KEYS.categories.list({ active: true }),
    queryFn: () =>
      categoriesApi.list({ status: 'active', limit: 100, sortBy: 'sortOrder', sortOrder: 'asc' }),
    // Matches the bootstrap cache window. Forcing a refetch on every mount
    // discarded the prefetched list and added a blocking request on first load.
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoryBySlug(slug: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: QUERY_KEYS.categories.detail(slug),
    queryFn: async () => {
      // Bootstrap already seeds the active categories list — reuse it instead of
      // a second `?q=slug` round-trip that blocked the product grid.
      const fromList = findCategoryInListCache(queryClient, slug);
      if (fromList) return fromList;
      return categoriesApi.getBySlug(slug);
    },
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 10,
    initialData: () => (slug ? findCategoryInListCache(queryClient, slug) : undefined),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(QUERY_KEYS.categories.list({ active: true }))?.dataUpdatedAt,
  });
}

export function useCatalogFilterFacets(options?: {
  includeBrands?: boolean;
  includeCollections?: boolean;
  /** When false, skip network — use to defer facets until the filter sheet opens. */
  enabled?: boolean;
}) {
  const includeBrands = options?.includeBrands ?? true;
  const includeCollections = options?.includeCollections ?? true;
  const enabled = options?.enabled ?? true;

  const brands = useQuery({
    queryKey: QUERY_KEYS.cms.brands({ active: true }),
    queryFn: () => cmsApi.listBrands({ status: 'active', limit: 100 }),
    staleTime: 1000 * 60 * 10,
    enabled: enabled && includeBrands,
  });
  const collections = useQuery({
    queryKey: QUERY_KEYS.cms.collections({ active: true }),
    queryFn: () => cmsApi.listCollections({ status: 'active', limit: 100 }),
    staleTime: 1000 * 60 * 10,
    enabled: enabled && includeCollections,
  });
  const categories = useQuery({
    queryKey: QUERY_KEYS.categories.list({ active: true }),
    queryFn: () =>
      categoriesApi.list({ status: 'active', limit: 100, sortBy: 'sortOrder', sortOrder: 'asc' }),
    staleTime: 1000 * 60 * 5,
    enabled,
  });
  const colors = useQuery({
    queryKey: ['catalog', 'facets', 'colors'],
    queryFn: () => catalogFacetsApi.listColors(),
    staleTime: 1000 * 60 * 10,
    enabled,
  });
  const sizes = useQuery({
    queryKey: ['catalog', 'facets', 'sizes'],
    queryFn: () => catalogFacetsApi.listSizes(),
    staleTime: 1000 * 60 * 10,
    enabled,
  });
  const materials = useQuery({
    queryKey: ['catalog', 'facets', 'materials'],
    queryFn: () => catalogFacetsApi.listMaterials(),
    staleTime: 1000 * 60 * 10,
    enabled,
  });
  const occasions = useQuery({
    queryKey: ['catalog', 'facets', 'occasions'],
    queryFn: () => catalogFacetsApi.listOccasions(),
    staleTime: 1000 * 60 * 10,
    enabled,
  });

  return { brands, collections, categories, colors, sizes, materials, occasions };
}
