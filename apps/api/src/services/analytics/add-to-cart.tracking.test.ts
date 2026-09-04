import { describe, expect, it } from 'vitest';
import { buildAddToCartCapiInput } from '@/services/analytics/add-to-cart.tracking.js';

describe('AddToCart CAPI payload from cart add', () => {
  it('uses event name AddToCart and the shared event_id', () => {
    const payload = buildAddToCartCapiInput({
      variantId: '507f1f77bcf86cd799439011',
      quantity: 1,
      eventId: 'evt-shared',
      fbp: 'fb.1.1554763741205.1234567890',
      fbc: 'fb.1.1554763741205.AbCdEf',
      line: {
        variantId: '507f1f77bcf86cd799439011',
        title: 'Silk Dress',
        currentPrice: 2500,
        currency: 'LKR',
      },
      user: {
        id: 'user-1',
        email: 'shopper@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
      customerId: 'cust-1',
      ip: '203.0.113.10',
      userAgent: 'Mozilla/5.0',
    });

    expect(payload.eventName).toBe('AddToCart');
    expect(payload.eventId).toBe('evt-shared');
    expect(payload.customData.content_ids).toEqual(['507f1f77bcf86cd799439011']);
    expect(payload.customData.currency).toBe('LKR');
    expect(payload.customData.value).toBe(2500);
    expect(payload.userData.email).toBe('shopper@example.com');
    expect(payload.userData.fbp).toBe('fb.1.1554763741205.1234567890');
    expect(payload.userData.fbc).toBe('fb.1.1554763741205.AbCdEf');
    expect(payload.userData.ipAddress).toBe('203.0.113.10');
  });

  it('does not invent fbc', () => {
    const payload = buildAddToCartCapiInput({
      variantId: '507f1f77bcf86cd799439011',
      quantity: 1,
      line: { currentPrice: 100, currency: 'LKR' },
    });
    expect(payload.userData.fbc).toBeNull();
  });
});
