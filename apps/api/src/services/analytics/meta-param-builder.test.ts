import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  formatMetaDateOfBirth,
  hashMetaPii,
  resolveExplicitMetaClickIds,
  sanitizeMetaClickId,
  sanitizeMetaClientIp,
} from '@/services/analytics/meta-param-builder.js';
import { completeRegistrationEventId } from '@/services/analytics/complete-registration.tracking.js';

describe('Meta Parameter Builder wrappers', () => {
  it('preserves fbc casing and rejects empty values', () => {
    const fbc = 'fb.1.1554763741205.AbCdEfGh';
    expect(sanitizeMetaClickId(fbc)).toBe(fbc);
    expect(sanitizeMetaClickId(` ${fbc} `)).toBe(fbc);
    expect(sanitizeMetaClickId('')).toBeUndefined();
    expect(sanitizeMetaClickId('not-a-meta-id')).toBeUndefined();
  });

  it('does not overwrite a valid fbc when fbclid is also present', () => {
    const fbc = 'fb.1.1554763741205.OriginalClick';
    const resolved = resolveExplicitMetaClickIds({
      fbp: 'fb.1.1554763741205.1234567890',
      fbc,
      fbclid: 'DifferentClick',
    });
    expect(resolved.fbc).toBe(fbc);
    expect(resolved.fbp).toBe('fb.1.1554763741205.1234567890');
  });

  it('constructs fbc from fbclid when no cookie was sent', () => {
    const resolved = resolveExplicitMetaClickIds({
      fbp: 'fb.1.1554763741205.1234567890',
      fbclid: 'IwAR-test-click',
    });
    expect(resolved.fbc).toMatch(/^fb\./);
    expect(resolved.fbc).toContain('IwAR-test-click');
    expect(resolved.fbp).toBe('fb.1.1554763741205.1234567890');
  });

  it('does not invent an fbp', () => {
    const resolved = resolveExplicitMetaClickIds({ fbclid: 'IwAR-only' });
    expect(resolved.fbp).toBeUndefined();
  });

  it('hashes email once via Parameter Builder', () => {
    const hashed = hashMetaPii('  Test@EXAMPLE.COM  ', 'email');
    const expected = createHash('sha256').update('test@example.com').digest('hex');
    expect(hashed?.startsWith(expected)).toBe(true);
    expect(hashed).toMatch(/^[a-f0-9]{64}(\.[A-Za-z0-9]+)?$/);
    expect(hashMetaPii('', 'email')).toBeUndefined();
    expect(hashMetaPii(null, 'email')).toBeUndefined();
  });

  it('does not re-hash an already hashed SHA-256 value', () => {
    const alreadyHashed = createHash('sha256').update('test@example.com').digest('hex');
    expect(hashMetaPii(alreadyHashed, 'email')).toBe(alreadyHashed);
    expect(hashMetaPii(alreadyHashed.toUpperCase(), 'email')).toBe(alreadyHashed);
  });

  it('omits empty last names', () => {
    expect(hashMetaPii('', 'last_name')).toBeUndefined();
    expect(hashMetaPii('   ', 'last_name')).toBeUndefined();
  });

  it('formats date of birth as YYYYMMDD', () => {
    expect(formatMetaDateOfBirth(new Date(Date.UTC(1994, 2, 15)))).toBe('19940315');
    expect(formatMetaDateOfBirth(null)).toBeUndefined();
  });

  it('uses a stable CompleteRegistration event_id per user', () => {
    expect(completeRegistrationEventId('user-1')).toBe('complete-registration-user-1');
    expect(completeRegistrationEventId('user-1')).toBe(completeRegistrationEventId('user-1'));
  });

  it('strips Parameter Builder appendix from IP addresses', () => {
    expect(sanitizeMetaClientIp('203.0.113.10')).toBe('203.0.113.10');
    expect(sanitizeMetaClientIp('203.0.113.10.AQQCAQMB')).toBe('203.0.113.10');
    expect(sanitizeMetaClientIp('not-an-ip')).toBeUndefined();
  });
});
