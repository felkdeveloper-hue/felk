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

  it('requires full name and a valid password for register', () => {
    const result = registerSchema.safeParse({
      fullName: '',
      email: 'jane@example.com',
      phone: '',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid register payload', () => {
    const result = registerSchema.safeParse({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+15550100',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });
});
