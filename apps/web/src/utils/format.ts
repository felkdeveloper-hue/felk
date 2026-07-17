/** Format a number as currency (defaults to LKR for this platform). */
export function formatCurrency(amount: number, currency = 'LKR', locale = 'en-LK'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** Format an ISO date or Date for display. */
export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale = 'en-LK',
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Truncate text with ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Sleep helper for retry/backoff in SDK layers. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build query string from a flat params object (skips undefined/null). */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
