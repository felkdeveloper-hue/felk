import { describe, expect, it } from 'vitest';
import { normalizeAuthSession, normalizeAuthUser } from '@/utils/auth';

describe('normalizeAuthUser', () => {
  it('maps roleKey and emailVerified from API payloads', () => {
    const user = normalizeAuthUser({
      id: '1',
      email: 'user@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      roleKey: 'customer',
      emailVerified: true,
    });

    expect(user.roles).toEqual(['customer']);
    expect(user.isEmailVerified).toBe(true);
    expect(user.name).toBe('Ada Lovelace');
  });
});

describe('normalizeAuthSession', () => {
  it('normalizes nested user on login responses', () => {
    const session = normalizeAuthSession({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 900,
      user: {
        id: '1',
        email: 'user@example.com',
        roleKey: 'customer',
        emailVerified: false,
      },
    });

    expect(session.accessToken).toBe('a');
    expect(session.user.roles).toEqual(['customer']);
    expect(session.user.isEmailVerified).toBe(false);
  });
});
