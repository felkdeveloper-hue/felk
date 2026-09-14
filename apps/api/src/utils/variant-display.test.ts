import { describe, expect, it } from 'vitest';
import { composeVariantTitle, variantTitleLooksComplete } from '@/utils/variant-display.js';

describe('composeVariantTitle', () => {
  it('joins color and size the same way as other orders', () => {
    expect(composeVariantTitle('Black', 'XL')).toBe('Black / XL');
    expect(composeVariantTitle('green', 'S')).toBe('green / S');
  });

  it('falls back to a size-only variant title when color is missing', () => {
    expect(composeVariantTitle(null, 'XL', 'XL')).toBe('XL');
    expect(composeVariantTitle(null, null, 'Ivory / M')).toBe('Ivory / M');
  });

  it('keeps an existing color / size title when color was not snapshotted', () => {
    expect(composeVariantTitle(null, 'S', 'green / S')).toBe('green / S');
  });
});

describe('variantTitleLooksComplete', () => {
  it('treats size-only titles as incomplete', () => {
    expect(variantTitleLooksComplete('XL')).toBe(false);
    expect(variantTitleLooksComplete('Black / XL')).toBe(true);
    expect(variantTitleLooksComplete('XL', 'Black')).toBe(true);
  });
});
