import { describe, expect, it } from 'vitest';
import { resolveProductPlaceSort } from './product-place-sort.js';

describe('resolveProductPlaceSort', () => {
  it('puts catalog place first on the default shop listing', () => {
    expect(resolveProductPlaceSort({ sortBy: 'createdAt' })).toBe('catalogPlace');
  });

  it('uses best-seller place when that flag is filtered', () => {
    expect(resolveProductPlaceSort({ isBestSeller: true, sortBy: 'updatedAt' })).toBe(
      'bestSellerPlace',
    );
  });

  it('uses new-arrival place when that flag is filtered', () => {
    expect(resolveProductPlaceSort({ isNewArrival: true, sortBy: 'createdAt' })).toBe(
      'newArrivalPlace',
    );
  });

  it('does not override an explicit price/name sort', () => {
    expect(resolveProductPlaceSort({ sortBy: 'pricing.price' })).toBeNull();
    expect(resolveProductPlaceSort({ isBestSeller: true, sortBy: 'name' })).toBeNull();
  });

  it('skips place sort during keyword search', () => {
    expect(resolveProductPlaceSort({ q: 'dress', sortBy: 'createdAt' })).toBeNull();
  });

  it('uses FE Basics place when that flag is filtered', () => {
    expect(resolveProductPlaceSort({ isFeBasics: true, sortBy: 'createdAt' })).toBe('feBasicsPlace');
  });
});
