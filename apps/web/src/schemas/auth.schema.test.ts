import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '@/schemas';

describe('auth schemas', () => {
  it('requires email and password for login', () => {
    const result = loginSchema.safeParse({ email: '', password: '', rememberMe: false });
    expect(result.success).toBe(false);
  });

  it('accepts valid login payload', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });

  it('requires matching passwords and terms acceptance for register', () => {
    const result = registerSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      acceptTerms: false,
      newsletterOptIn: false,
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid register payload', () => {
    const result = registerSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+15550100',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      acceptTerms: true,
      newsletterOptIn: true,
    });
    expect(result.success).toBe(true);
  });
});
