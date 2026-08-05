import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  isExpired,
  msUntilExpiry,
  normalizeCheckoutSession,
} from '@/utils/checkout';

describe('normalizeCheckoutSession', () => {
  it('maps backend summary fields to CheckoutSession', () => {
    const session = normalizeCheckoutSession({
      id: 'chk_1',
      checkoutToken: 'token_abc',
      status: 'ready',
      currency: 'LKR',
      lines: [
        {
          productId: 'p1',
          variantId: 'v1',
          sku: 'SKU',
          title: 'Dress',
          quantity: 2,
          lineSubtotal: 800,
        },
      ],
      totals: { subtotal: 800, discount: 0, shipping: 400, tax: 0, grandTotal: 1200 },
      summary: { readyForPayment: true },
    });

    expect(session.checkoutToken).toBe('token_abc');
    expect(session.lines).toHaveLength(1);
    expect(session.totals.grandTotal).toBe(1200);
    expect(session.readyForPayment).toBe(true);
  });

  it('treats open sessions with address + lines as ready when summary is missing', () => {
    const session = normalizeCheckoutSession({
      id: 'chk_2',
      checkoutToken: 'token_open',
      status: 'open',
      currency: 'LKR',
      shippingAddress: {
        addressId: 'a1',
        fullName: 'Felk',
        line1: '123 Main',
        city: 'Colombo',
        postalCode: '00100',
        country: 'LK',
      },
      lines: [{ productId: 'p1', variantId: 'v1', sku: 'SKU', title: 'Top', quantity: 1 }],
      totals: { subtotal: 1000, discount: 0, shipping: 500, tax: 0, grandTotal: 1500 },
    });

    expect(session.readyForPayment).toBe(true);
  });
});

describe('checkout expiry helpers', () => {
  it('detects expired timestamps', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isExpired(past)).toBe(true);
    expect(msUntilExpiry(past)).toBe(0);
  });

  it('formats countdown labels', () => {
    expect(formatCountdown(125_000)).toBe('02:05');
  });
});
