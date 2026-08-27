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
});
