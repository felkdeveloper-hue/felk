import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { categoriesApi, cmsApi, catalogFacetsApi } from '@/services/sdk';

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
  return useQuery({
    queryKey: QUERY_KEYS.categories.detail(slug),
    queryFn: () => categoriesApi.getBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 10,
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
