import { describe, expect, it } from 'vitest';
import {
  classifyTrafficSource,
  detectInAppSource,
  formatAttribution,
  hasAttributionSignal,
  pickFirstTouchAttribution,
} from './source-attribution.util.js';

describe('source attribution', () => {
  it('treats fbclid as paid social, not Direct', () => {
    const signals = { fbclid: 'IwAR123' };
    expect(hasAttributionSignal(signals)).toBe(true);
    expect(classifyTrafficSource(signals)).toBe('paid_social');
    expect(formatAttribution({ trafficSource: 'paid_social', ...signals }).label).toBe(
      'Facebook Ads',
    );
  });

  it('labels Instagram Ads when UTMs or in-app browser say Instagram', () => {
    expect(
      formatAttribution({
        trafficSource: 'paid_social',
        utmSource: 'instagram',
        utmMedium: 'paid',
        fbclid: 'abc',
      }).label,
    ).toBe('Instagram Ads');

    expect(
      formatAttribution({
        trafficSource: 'paid_social',
        fbclid: 'abc',
        inAppSource: 'instagram',
      }).label,
    ).toBe('Instagram Ads');

    expect(
      formatAttribution({
        trafficSource: 'paid_social',
        utmCampaign: 'ig_spring_sale',
        fbclid: 'abc',
      }).label,
    ).toBe('Instagram Ads');
  });

  it('does not let a later Direct visit overwrite Facebook/Instagram ads', () => {
    const first = {
      fbclid: 'IwAR-ads',
      utmSource: 'instagram',
      utmMedium: 'paid',
    };
    const laterDirect = {
      referrer: null,
      utmSource: null,
      fbclid: null,
    };
    const kept = pickFirstTouchAttribution(first, laterDirect);
    expect(kept.fbclid).toBe('IwAR-ads');
    expect(kept.utmSource).toBe('instagram');
    expect(formatAttribution({ trafficSource: classifyTrafficSource(kept), ...kept }).label).toBe(
      'Instagram Ads',
    );
  });

  it('ignores payment and Vercel referrers as acquisition', () => {
    expect(hasAttributionSignal({ referrer: 'https://www.payhere.lk/pay' })).toBe(false);
    expect(hasAttributionSignal({ referrer: 'https://vercel.com/' })).toBe(false);
    expect(classifyTrafficSource({ referrer: 'https://www.payhere.lk/pay' })).toBe('direct');
  });

  it('labels Instagram link-in-bio as Instagram, not Facebook Ads, even with fbclid', () => {
    const signals = {
      utmSource: 'ig',
      utmMedium: 'social',
      utmContent: 'link_in_bio',
      fbclid: 'PAcGRwZgJleHRuA2',
    };
    expect(classifyTrafficSource(signals)).toBe('social');
    expect(formatAttribution({ trafficSource: 'social', ...signals }).label).toBe('Instagram');
  });

  it('labels a Facebook ad click with only fbclid as Facebook Ads', () => {
    const signals = { fbclid: 'IwZXh0bgNhZW0BMABhZGlkAas' };
    expect(classifyTrafficSource(signals)).toBe('paid_social');
    expect(formatAttribution({ trafficSource: 'paid_social', ...signals }).label).toBe(
      'Facebook Ads',
    );
  });

  it('detects Instagram in-app browsers from the user agent', () => {
    expect(
      detectInAppSource('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram 310.0.0'),
    ).toBe('instagram');
  });
});
