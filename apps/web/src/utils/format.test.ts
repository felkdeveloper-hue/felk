import { describe, expect, it } from 'vitest';
import { formatCurrency, truncate, toQueryString } from '@/utils';

describe('format utils', () => {
  it('formats currency', () => {
    expect(formatCurrency(2500, 'LKR')).toMatch(/2,500/);
  });

  it('truncates long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello W…');
  });

  it('builds query strings', () => {
    expect(toQueryString({ page: 1, q: 'dress', empty: '' })).toBe('?page=1&q=dress');
  });
});
