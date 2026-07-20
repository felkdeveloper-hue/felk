import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class names, resolving conflicting utility classes
 * (e.g. `p-2` vs `p-4`) in favor of the last one provided.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'LKR', locale = 'en-LK'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatDate(value: string | Date, locale = 'en-LK'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function normalizeId(raw: unknown): string {
  const record = asRecord(raw);
  return String(record.id ?? record._id ?? '');
}

export function normalizeList<T>(rows: unknown[], mapper: (row: unknown) => T): T[] {
  return Array.isArray(rows) ? rows.map(mapper) : [];
}
