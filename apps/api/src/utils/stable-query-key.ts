/** Deterministic cache key for query objects (key order independent). */
export function stableQueryKey(query: Record<string, unknown>): string {
  const keys = Object.keys(query).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) {
    const value = query[key];
    if (value === undefined) continue;
    normalized[key] = value;
  }
  return JSON.stringify(normalized);
}
