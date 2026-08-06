import { describe, it, expect, vi } from 'vitest';

vi.mock('@/config/app.config', () => ({
  appConfig: {
    email: { shopUrl: 'https://fe.lk' },
    cors: { origins: ['https://fe.lk'] },
  },
}));

describe('Mintpay gateway helpers', () => {
  it('shortens guest checkout emails under Mintpay 40-char limit', async () => {
    const { resolveMintpayEmail } = await import('@/services/gateways/gateway.utils.js');
    const longGuest = `guest-${'550e8400-e29b-41d4-a716-446655440000'}@guest.fe.lk`;
    expect(longGuest.length).toBeGreaterThan(40);

    const resolved = resolveMintpayEmail(longGuest, {
      customerPhone: '+91 09583682548',
      customerId: '674a1b2c3d4e5f6789012345',
    });

    expect(resolved.length).toBeLessThanOrEqual(40);
    expect(resolved).toMatch(/@fe\.lk$/);
    expect(resolved).toContain('g+');
  });

  it('keeps regular customer emails unchanged', async () => {
    const { resolveMintpayEmail } = await import('@/services/gateways/gateway.utils.js');
    expect(resolveMintpayEmail('shopper@example.com')).toBe('shopper@example.com');
  });

  it('normalizes telephone to 10 digits', async () => {
    const { normalizeMintpayTelephone } = await import('@/services/gateways/gateway.utils.js');
    expect(normalizeMintpayTelephone('+94 77 123 4567')).toBe('0771234567');
    expect(normalizeMintpayTelephone('+91 09583682548')).toBe('9583682548');
  });
});
