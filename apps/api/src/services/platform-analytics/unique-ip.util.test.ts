import { describe, expect, it } from 'vitest';
import { uniqueIpKey } from './unique-ip.util.js';

describe('uniqueIpKey', () => {
  it('prefers real ipHash over visitorId', () => {
    expect(uniqueIpKey('abc123', 'vid-1')).toBe('ip:abc123');
  });

  it('falls back to visitorId when ipHash missing or unknown', () => {
    expect(uniqueIpKey(null, 'vid-1')).toBe('v:vid-1');
    expect(uniqueIpKey('', 'vid-1')).toBe('v:vid-1');
    expect(uniqueIpKey('unknown', 'vid-1')).toBe('v:vid-1');
  });

  it('same IP collapses two visitor cookies to one key', () => {
    expect(uniqueIpKey('same-ip', 'cookie-a')).toBe(uniqueIpKey('same-ip', 'cookie-b'));
  });

  it('refresh with same cookie keeps the same fallback key', () => {
    expect(uniqueIpKey(null, 'stable-cookie')).toBe('v:stable-cookie');
    expect(uniqueIpKey(null, 'stable-cookie')).toBe(uniqueIpKey(undefined, 'stable-cookie'));
  });
});
