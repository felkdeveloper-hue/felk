import type { ProductListParams, Product } from '@/services/sdk/products';

export type CatalogViewMode = 'grid' | 'list';

export interface CatalogSearchState {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  view?: CatalogViewMode;
  q?: string;
  categoryId?: string;
  brandId?: string;
  collectionId?: string;
  minPrice?: number;
  maxPrice?: number;
  colorId?: string;
  sizeId?: string;
  materialId?: string;
  occasionId?: string;
  inStock?: boolean;
  onSale?: boolean;
  rating?: string;
  isNewArrival?: boolean;
}

export const DEFAULT_CATALOG_SEARCH: CatalogSearchState = {
  page: 1,
  limit: 24,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  view: 'grid',
};

export function parseCatalogSearch(search: Record<string, unknown>): CatalogSearchState {
  const num = (value: unknown) => {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const bool = (value: unknown) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };

  return {
    page: num(search.page) ?? DEFAULT_CATALOG_SEARCH.page,
    limit: num(search.limit) ?? DEFAULT_CATALOG_SEARCH.limit,
    sortBy: typeof search.sortBy === 'string' ? search.sortBy : DEFAULT_CATALOG_SEARCH.sortBy,
    sortOrder:
      search.sortOrder === 'asc' || search.sortOrder === 'desc'
        ? search.sortOrder
        : DEFAULT_CATALOG_SEARCH.sortOrder,
    view: search.view === 'list' ? 'list' : 'grid',
    q: typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined,
    categoryId: typeof search.categoryId === 'string' ? search.categoryId : undefined,
    brandId: typeof search.brandId === 'string' ? search.brandId : undefined,
    collectionId: typeof search.collectionId === 'string' ? search.collectionId : undefined,
    minPrice: num(search.minPrice),
    maxPrice: num(search.maxPrice),
    colorId: typeof search.colorId === 'string' ? search.colorId : undefined,
    sizeId: typeof search.sizeId === 'string' ? search.sizeId : undefined,
    materialId: typeof search.materialId === 'string' ? search.materialId : undefined,
    occasionId: typeof search.occasionId === 'string' ? search.occasionId : undefined,
    inStock: bool(search.inStock),
    onSale: bool(search.onSale),
    rating: typeof search.rating === 'string' ? search.rating : undefined,
    isNewArrival: bool(search.isNewArrival),
  };
}

export function catalogSearchToProductParams(state: CatalogSearchState): ProductListParams {
  const params: ProductListParams = {
    page: state.page,
    limit: state.limit,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    q: state.q,
    categoryId: state.categoryId,
    brandId: state.brandId,
    collectionId: state.collectionId,
    minPrice: state.minPrice,
    maxPrice: state.maxPrice,
    isNewArrival: state.isNewArrival,
    isClearance: state.onSale ? true : undefined,
  };

  return params;
}

export function countActiveFilters(state: CatalogSearchState): number {
  let count = 0;
  if (state.q) count += 1;
  if (state.categoryId) count += 1;
  if (state.brandId) count += 1;
  if (state.collectionId) count += 1;
  if (state.minPrice != null || state.maxPrice != null) count += 1;
  if (state.colorId) count += 1;
  if (state.sizeId) count += 1;
  if (state.materialId) count += 1;
  if (state.occasionId) count += 1;
  if (state.inStock != null) count += 1;
  if (state.onSale != null) count += 1;
  if (state.rating) count += 1;
  if (state.isNewArrival != null) count += 1;
  return count;
}

export function catalogSearchToUrlParams(state: CatalogSearchState): Record<string, string> {
  const params: Record<string, string> = {};
  const assign = (key: string, value: string | number | boolean | undefined) => {
    if (value === undefined || value === '' || value === false) return;
    params[key] = String(value);
  };

  assign('page', state.page && state.page > 1 ? state.page : undefined);
  assign(
    'limit',
    state.limit && state.limit !== DEFAULT_CATALOG_SEARCH.limit ? state.limit : undefined,
  );
  assign('sortBy', state.sortBy !== DEFAULT_CATALOG_SEARCH.sortBy ? state.sortBy : undefined);
  assign(
    'sortOrder',
    state.sortOrder !== DEFAULT_CATALOG_SEARCH.sortOrder ? state.sortOrder : undefined,
  );
  assign('view', state.view === 'list' ? 'list' : undefined);
  assign('q', state.q);
  assign('categoryId', state.categoryId);
  assign('brandId', state.brandId);
  assign('collectionId', state.collectionId);
  assign('minPrice', state.minPrice);
  assign('maxPrice', state.maxPrice);
  assign('colorId', state.colorId);
  assign('sizeId', state.sizeId);
  assign('materialId', state.materialId);
  assign('occasionId', state.occasionId);
  assign(
    'inStock',
    state.inStock === true ? 'true' : state.inStock === false ? 'false' : undefined,
  );
  assign('onSale', state.onSale === true ? 'true' : undefined);
  assign('rating', state.rating);
  assign('isNewArrival', state.isNewArrival ? 'true' : undefined);

  return params;
}

/** Client-side refinement for filters not supported by the list API. */
export function applyClientCatalogFilters(products: Product[], state: CatalogSearchState) {
  return products.filter((product) => {
    if (state.materialId && product.materialId !== state.materialId) return false;
    if (state.occasionId && !product.occasionIds?.includes(state.occasionId)) return false;
    if (state.inStock === true && product.status === 'out_of_stock') return false;
    if (state.onSale === true && !product.isOnSale && !product.isClearance) return false;
    if (state.colorId) {
      const hasColor = product.variants?.some((variant) => variant.colorId === state.colorId);
      if (product.variants?.length && !hasColor) return false;
    }
    if (state.sizeId) {
      const hasSize = product.variants?.some((variant) => variant.sizeId === state.sizeId);
      if (product.variants?.length && !hasSize) return false;
    }
    return true;
  });
}
