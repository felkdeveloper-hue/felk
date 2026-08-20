import { describe, expect, it } from 'vitest';
import { pickFirstTouch, hasAcquisitionSignal, type AttributionSnapshot } from './attribution';

describe('pickFirstTouch', () => {
  it('keeps Instagram ads when the shopper later types the URL (Direct)', () => {
    const existing: AttributionSnapshot = {
      utmSource: 'instagram',
      utmMedium: 'paid',
      fbclid: 'IwAR-ig',
      landingPath: '/',
    };
    const laterDirect: AttributionSnapshot = {
      referrer: null,
      utmSource: null,
      fbclid: null,
      landingPath: '/checkout',
    };
    const kept = pickFirstTouch(existing, laterDirect);
    expect(kept.utmSource).toBe('instagram');
    expect(kept.fbclid).toBe('IwAR-ig');
    expect(hasAcquisitionSignal(kept)).toBe(true);
  });

  it('does not treat payment-gateway returns as a new source', () => {
    const existing: AttributionSnapshot = {
      utmSource: 'facebook',
      utmMedium: 'cpc',
      fbclid: 'click',
    };
    const fromPayhere: AttributionSnapshot = {
      referrer: 'https://www.payhere.lk/pay/checkout',
    };
    expect(hasAcquisitionSignal(fromPayhere)).toBe(false);
    expect(pickFirstTouch(existing, fromPayhere).fbclid).toBe('click');
  });

  it('upgrades an empty first visit when ads arrive later', () => {
    const existing: AttributionSnapshot = { landingPath: '/' };
    const ads: AttributionSnapshot = { fbclid: 'meta-click', inAppSource: 'instagram' };
    const kept = pickFirstTouch(existing, ads);
    expect(kept.fbclid).toBe('meta-click');
    expect(kept.inAppSource).toBe('instagram');
  });
});
