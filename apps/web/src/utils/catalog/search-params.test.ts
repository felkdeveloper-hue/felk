import { describe, expect, it } from 'vitest';
import {
  applyClientCatalogFilters,
  catalogSearchToProductParams,
  countActiveFilters,
  parseCatalogSearch,
} from '@/utils/catalog';

describe('catalog search params', () => {
  it('parses URL search params', () => {
    const state = parseCatalogSearch({
      page: '2',
      sortBy: 'name',
      sortOrder: 'asc',
      view: 'list',
      brandId: 'brand_1',
      q: 'dress',
    });

    expect(state.page).toBe(2);
    expect(state.sortBy).toBe('name');
    expect(state.view).toBe('list');
    expect(state.brandId).toBe('brand_1');
    expect(state.q).toBe('dress');
  });

  it('maps isBestSeller to product API params', () => {
    const params = catalogSearchToProductParams({ ...parseCatalogSearch({}), isBestSeller: true });
    expect(params.isBestSeller).toBe(true);
    expect(params.isNewArrival).toBeUndefined();
  });

  it('maps isFeBasics to product API params', () => {
    const params = catalogSearchToProductParams({ ...parseCatalogSearch({}), isFeBasics: true });
    expect(params.isFeBasics).toBe(true);
    expect(params.isBestSeller).toBeUndefined();
  });

  it('counts active filters', () => {
    const count = countActiveFilters(
      parseCatalogSearch({ brandId: 'brand_1', minPrice: '100', q: 'silk' }),
    );
    expect(count).toBe(3);
  });

  it('applies client-side material filter', () => {
    const filtered = applyClientCatalogFilters(
      [
        { id: '1', name: 'A', slug: 'a', status: 'active', materialId: 'mat_1' },
        { id: '2', name: 'B', slug: 'b', status: 'active', materialId: 'mat_2' },
      ],
      parseCatalogSearch({ materialId: 'mat_1' }),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('1');
  });
});
