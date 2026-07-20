/** Product is live or scheduled on the storefront (API uses `active`, not `published`). */
export function isProductLive(status?: string | null): boolean {
  const normalized = status?.toLowerCase();
  return normalized === 'active' || normalized === 'published' || normalized === 'scheduled';
}

/** Map legacy admin filter values to API status codes. */
export function normalizeProductStatusFilter(status?: string): string | undefined {
  if (!status) return undefined;
  if (status === 'published') return 'active';
  return status;
}
