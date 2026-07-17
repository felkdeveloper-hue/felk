import { describe, expect, it } from 'vitest';
import { normalizeCartLineItem, normalizeCartView } from '@/utils/cart';

describe('normalizeCartView', () => {
  it('maps backend cart payloads to storefront cart view', () => {
    const cart = normalizeCartView({
      cart: { id: 'cart_1', status: 'active' },
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          variantId: 'var_1',
          title: 'Silk Dress',
          sku: 'SD-001',
          quantity: 2,
          currentPrice: 420,
          lineSubtotal: 840,
          colorName: 'Ivory',
          sizeName: 'M',
          thumbnailUrl: 'https://example.com/dress.jpg',
          currency: 'LKR',
        },
      ],
      totals: {
        currency: 'LKR',
        subtotal: 840,
        grandTotal: 840,
        estimatedTax: 0,
        estimatedShipping: 0,
      },
      guestCartToken: 'guest-token',
    });

    expect(cart.id).toBe('cart_1');
    expect(cart.items[0]?.name).toBe('Silk Dress');
    expect(cart.items[0]?.colorName).toBe('Ivory');
    expect(cart.totals.total).toBe(840);
    expect(cart.guestCartToken).toBe('guest-token');
  });
});

describe('normalizeCartLineItem', () => {
  it('derives display fields from backend line items', () => {
    const item = normalizeCartLineItem({
      id: 'item_1',
      title: 'Linen Shirt',
      currentPrice: 120,
      quantity: 1,
      lineSubtotal: 120,
      priceChanged: true,
      priceDifference: 10,
    });

    expect(item.name).toBe('Linen Shirt');
    expect(item.priceChanged).toBe(true);
    expect(item.priceDifference).toBe(10);
  });
});
