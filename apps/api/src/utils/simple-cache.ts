const store = new Map<string, { data: unknown; expires: number }>();

/** Short-lived in-memory cache for hot read endpoints (e.g. storefront bootstrap). */
export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry || Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs = 300_000): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

/** Drop all in-memory entries (call after seeds / CMS writes that change public lists). */
export function clearCache(): void {
  store.clear();
}
