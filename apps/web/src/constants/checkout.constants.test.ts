import { describe, expect, it } from 'vitest';
import {
  FIXED_SHIPPING_AMOUNT,
  FREE_SHIPPING_THRESHOLD,
  isFreeDeliveryUnlocked,
  previewShippingAmount,
  productWorthForFreeDelivery,
  remainingForFreeDelivery,
} from './checkout.constants';

describe('previewShippingAmount', () => {
  it('charges the flat fee below the free-delivery threshold', () => {
    expect(previewShippingAmount(0, false, 3000)).toBe(FIXED_SHIPPING_AMOUNT);
    expect(previewShippingAmount(500, false, 1200)).toBe(500);
    expect(remainingForFreeDelivery(3000)).toBe(2000);
  });

  it('returns free shipping at LKR 5,000 cart size', () => {
    expect(isFreeDeliveryUnlocked(FREE_SHIPPING_THRESHOLD)).toBe(true);
    expect(previewShippingAmount(500, false, 5000)).toBe(0);
    expect(previewShippingAmount(0, false, 8000)).toBe(0);
    expect(remainingForFreeDelivery(5000)).toBe(0);
  });

  it('waives shipping for staff even below the threshold', () => {
    expect(previewShippingAmount(500, true, 800)).toBe(0);
  });

  it('does not unlock free delivery when flash sale drops product worth below 5,000', () => {
    const worth = productWorthForFreeDelivery(5980, 1196);
    expect(worth).toBe(4784);
    expect(isFreeDeliveryUnlocked(worth)).toBe(false);
    expect(previewShippingAmount(0, false, worth)).toBe(FIXED_SHIPPING_AMOUNT);
    expect(remainingForFreeDelivery(worth)).toBe(216);
  });
});
