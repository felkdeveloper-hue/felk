import argon2 from 'argon2';
import { AUTH_LIMITS } from '@/constants/auth';
import { ApiError } from '@/utils/errors/api-error';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

const PASSWORD_RULES = [
  {
    test: (p: string) => p.length >= AUTH_LIMITS.PASSWORD_MIN_LENGTH,
    message: 'Password must be at least 8 characters',
  },
  { test: (p: string) => /[a-z]/.test(p), message: 'Password must include a lowercase letter' },
  { test: (p: string) => /[A-Z]/.test(p), message: 'Password must include an uppercase letter' },
  { test: (p: string) => /\d/.test(p), message: 'Password must include a number' },
  {
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
    message: 'Password must include a special character',
  },
];

export function assertPasswordStrength(password: string): void {
  const failures = PASSWORD_RULES.filter((rule) => !rule.test(password)).map((r) => r.message);

  if (failures.length > 0) {
    throw ApiError.badRequest(
      'Password does not meet strength requirements',
      { failures },
      'WEAK_PASSWORD',
    );
  }
}

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export async function wasPasswordUsedRecently(plain: string, history: string[]): Promise<boolean> {
  for (const previous of history) {
    if (await comparePassword(plain, previous)) {
      return true;
    }
  }
  return false;
}

export function pushPasswordHistory(
  currentHash: string,
  history: string[],
  size = AUTH_LIMITS.PASSWORD_HISTORY_SIZE,
): string[] {
  return [currentHash, ...history].slice(0, size);
}
