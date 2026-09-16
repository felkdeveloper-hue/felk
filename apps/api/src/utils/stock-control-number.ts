/**
 * Admin-only stock control numbers: trim blanks to null so many products can
 * omit the field, and compare case-insensitively for uniqueness.
 */
export function normalizeStockControlNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function stockControlNumberKey(value: string): string {
  return value.trim().toLowerCase();
}
