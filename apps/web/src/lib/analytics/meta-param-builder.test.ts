import { describe, expect, it, vi } from 'vitest';
import { getMetaClickPayload, getMetaFbc, getMetaFbp } from './meta-param-builder';

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
