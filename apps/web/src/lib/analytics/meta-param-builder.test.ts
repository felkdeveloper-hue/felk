import { describe, expect, it, vi } from 'vitest';
import { getMetaClickPayload, getMetaFbc, getMetaFbp } from './meta-param-builder';
import { normalizeMetaPageViewPath, shouldSendMetaPageView } from './meta-pixel';

vi.mock('./consent', () => ({
  hasMarketingConsent: () => true,
}));

describe('Meta browser click IDs', () => {
  it('reads _fbp and _fbc without altering casing', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '_fbp=fb.1.1554763741205.1234567890; _fbc=fb.1.1554763741205.AbCdEf',
    });

    expect(getMetaFbp()).toBe('fb.1.1554763741205.1234567890');
    expect(getMetaFbc()).toBe('fb.1.1554763741205.AbCdEf');
    expect(getMetaClickPayload()).toEqual({
      fbp: 'fb.1.1554763741205.1234567890',
      fbc: 'fb.1.1554763741205.AbCdEf',
    });
  });

  it('omits invalid click IDs', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '_fbp=not-valid; _fbc=',
    });

    expect(getMetaFbp()).toBeNull();
    expect(getMetaFbc()).toBeNull();
    expect(getMetaClickPayload()).toEqual({});
  });
});

describe('Meta PageView path', () => {
  it('treats trailing slashes and query strings as the same page', () => {
    expect(normalizeMetaPageViewPath('/products/dress')).toBe('/products/dress');
    expect(normalizeMetaPageViewPath('/products/dress/')).toBe('/products/dress');
    expect(normalizeMetaPageViewPath('/products/dress?color=1')).toBe('/products/dress');
    expect(normalizeMetaPageViewPath('/')).toBe('/');
    expect(normalizeMetaPageViewPath('')).toBe('/');
  });

  it('sends PageView on a new pathname but not on the same navigation', () => {
    expect(shouldSendMetaPageView(null, '/')).toBe(true);
    expect(shouldSendMetaPageView('/', '/')).toBe(false);
    expect(shouldSendMetaPageView('/', '/shop')).toBe(true);
    expect(shouldSendMetaPageView('/shop', '/products/abc')).toBe(true);
    expect(shouldSendMetaPageView('/products/abc', '/cart')).toBe(true);
    expect(shouldSendMetaPageView('/cart', '/shop')).toBe(true);
    expect(shouldSendMetaPageView('/shop', '/shop?sort=new')).toBe(false);
  });
});
