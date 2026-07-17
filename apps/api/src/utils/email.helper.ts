import { REGEX } from '@/constants/regex';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return REGEX.EMAIL.test(email);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }

  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
