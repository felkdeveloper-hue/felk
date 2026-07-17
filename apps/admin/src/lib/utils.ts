export { cn } from '@fe-platform/ui';

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
