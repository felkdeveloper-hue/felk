import { describe, expect, it } from 'vitest';
import { normalizeWishlistItem, getDefaultWishlist } from '@/utils/wishlist';

describe('wishlist utils', () => {
  it('normalizes populated wishlist items', () => {
    const item = normalizeWishlistItem({
      id: 'wli_1',
      productId: { id: 'prod_1', name: 'Silk Dress', slug: 'silk-dress', status: 'active' },
      variantId: { id: 'var_1', sku: 'SD-001', title: 'Medium', price: 420 },
    });

    expect(item.productName).toBe('Silk Dress');
    expect(item.productSlug).toBe('silk-dress');
    expect(item.variantSku).toBe('SD-001');
  });

  it('selects the default wishlist', () => {
    const selected = getDefaultWishlist([
      { id: 'wl_2', name: 'Gifts', items: [] },
      { id: 'wl_1', name: 'Default', isDefault: true, items: [] },
    ]);

    expect(selected?.id).toBe('wl_1');
  });
});
