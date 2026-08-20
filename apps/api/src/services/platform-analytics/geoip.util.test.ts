import { describe, expect, it } from 'vitest';
import { getClientIp, anonymizeIp } from './geoip.util.js';
import type { Request } from 'express';

function fakeReq(headers: Record<string, string>, ip?: string): Request {
  return { headers, ip } as unknown as Request;
}

describe('geoip', () => {
  it('prefers Cloudflare / real-ip / first X-Forwarded-For hop', () => {
    expect(getClientIp(fakeReq({ 'cf-connecting-ip': '1.2.3.4' }))).toBe('1.2.3.4');
    expect(getClientIp(fakeReq({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(getClientIp(fakeReq({ 'x-forwarded-for': '9.8.7.6, 10.0.0.1' }))).toBe('9.8.7.6');
  });

  it('anonymizes IPv4 to the /24', () => {
    expect(anonymizeIp('123.45.67.89')).toBe('123.45.67.0');
  });
});
