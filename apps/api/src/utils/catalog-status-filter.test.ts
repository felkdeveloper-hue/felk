import { describe, expect, it } from 'vitest';
import { catalogStatusMatch } from './catalog-status-filter.js';

describe('catalogStatusMatch', () => {
  it('converts a status array to $in so aggregation $match can find products', () => {
    expect(catalogStatusMatch(['active', 'out_of_stock'])).toEqual({
      status: { $in: ['active', 'out_of_stock'] },
    });
  });

  it('keeps a single status as equality', () => {
    expect(catalogStatusMatch('active')).toEqual({ status: 'active' });
  });

  it('uses $nin when excluding storefront-hidden statuses', () => {
    expect(catalogStatusMatch(undefined, ['draft', 'archived'])).toEqual({
      status: { $nin: ['draft', 'archived'] },
    });
  });
});
