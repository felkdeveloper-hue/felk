import { describe, expect, it } from 'vitest';
import {
  FIXED_SHIPPING_AMOUNT,
  FREE_SHIPPING_THRESHOLD,
  isFreeDeliveryUnlocked,
  productWorthForFreeDelivery,
  remainingForFreeDelivery,
  shippingFeeForSubtotal,
} from '@/constants/checkout.js';

describe('free delivery threshold', () => {
  it('keeps the island-wide fee below LKR 5,000', () => {
    expect(shippingFeeForSubtotal(0)).toBe(FIXED_SHIPPING_AMOUNT);
    expect(shippingFeeForSubtotal(2999.99)).toBe(FIXED_SHIPPING_AMOUNT);
    expect(shippingFeeForSubtotal(4999.99)).toBe(FIXED_SHIPPING_AMOUNT);
    expect(isFreeDeliveryUnlocked(3000)).toBe(false);
  });

  it('unlocks free delivery at exactly LKR 5,000 cart size', () => {
    expect(isFreeDeliveryUnlocked(FREE_SHIPPING_THRESHOLD)).toBe(true);
    expect(shippingFeeForSubtotal(5000)).toBe(0);
    expect(shippingFeeForSubtotal(12_500)).toBe(0);
    expect(remainingForFreeDelivery(5000)).toBe(0);
  });

  it('reports the exact remaining amount to unlock', () => {
    expect(remainingForFreeDelivery(0)).toBe(5000);
    expect(remainingForFreeDelivery(3000)).toBe(2000);
    expect(remainingForFreeDelivery(4999.5)).toBe(0.5);
  });

  it('uses payable product worth after discounts, not the list price', () => {
    expect(productWorthForFreeDelivery(5980, 1196)).toBe(4784);
    expect(isFreeDeliveryUnlocked(productWorthForFreeDelivery(5980, 1196))).toBe(false);
    expect(shippingFeeForSubtotal(productWorthForFreeDelivery(5980, 1196))).toBe(
      FIXED_SHIPPING_AMOUNT,
    );
    expect(remainingForFreeDelivery(4784)).toBe(216);
  });

  it('still waives pickup and staff orders below the threshold', () => {
    expect(shippingFeeForSubtotal(1000, { pickup: true })).toBe(0);
    expect(shippingFeeForSubtotal(1000, { waiveFee: true })).toBe(0);
  });
});
