const store = new Map<string, { data: unknown; expires: number }>();

/** Stable cache key so warmup (numbers) matches Express query (strings). */
export function storefrontProductsCacheKey(query: Record<string, unknown>): string {
  const normalized: Record<string, string> = {};
  for (const key of Object.keys(query).sort()) {
    const value = query[key];
    if (value === undefined || value === null || value === '') continue;
    normalized[key] = String(value);
  }
  return `storefront:products:${JSON.stringify(normalized)}`;
}

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

/** Drop entries whose key starts with any of the given prefixes (e.g. storefront catalog). */
export function clearCacheByPrefix(...prefixes: string[]): void {
  if (!prefixes.length) return;
  for (const key of store.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      store.delete(key);
    }
  }
}

/** Invalidate public catalog caches after product / inventory writes. */
export function invalidateStorefrontCatalogCache(): void {
  clearCacheByPrefix('storefront:products:', 'storefront:product:', 'storefront:bootstrap');
}
