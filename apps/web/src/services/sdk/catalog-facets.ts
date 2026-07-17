import { http } from '@/lib/http-client';
import type { ListQueryParams, PaginatedResult } from '@/types';

export interface CatalogFacet {
  id: string;
  name: string;
  slug?: string;
  sortOrder?: number;
  [key: string]: unknown;
}

function normalizeFacet(raw: unknown): CatalogFacet {
  const record = raw as Record<string, unknown>;
  return {
    id: String(record.id ?? record._id ?? ''),
    name: String(record.name ?? record.label ?? ''),
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : undefined,
  };
}

function mapFacets(rows: unknown[]): CatalogFacet[] {
  return rows.map(normalizeFacet);
}

/** Master-data facets for catalog filters. */
export const catalogFacetsApi = {
  listColors(params?: ListQueryParams): Promise<PaginatedResult<CatalogFacet>> {
    return http
      .getPaginated<CatalogFacet>('/storefront/colors', {
        params: { status: 'active', limit: 100, ...params },
      })
      .then((result) => ({ ...result, data: mapFacets(result.data) }));
  },

  listSizes(params?: ListQueryParams): Promise<PaginatedResult<CatalogFacet>> {
    return http
      .getPaginated<CatalogFacet>('/storefront/sizes', {
        params: { status: 'active', limit: 100, ...params },
      })
      .then((result) => ({ ...result, data: mapFacets(result.data) }));
  },

  listMaterials(params?: ListQueryParams): Promise<PaginatedResult<CatalogFacet>> {
    return http
      .getPaginated<CatalogFacet>('/storefront/materials', {
        params: { status: 'active', limit: 100, ...params },
      })
      .then((result) => ({ ...result, data: mapFacets(result.data) }));
  },

  listOccasions(params?: ListQueryParams): Promise<PaginatedResult<CatalogFacet>> {
    return http
      .getPaginated<CatalogFacet>('/storefront/occasions', {
        params: { status: 'active', limit: 100, ...params },
      })
      .then((result) => ({ ...result, data: mapFacets(result.data) }));
  },
};
