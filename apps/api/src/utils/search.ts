/**
 * Escape user input for safe use in RegExp.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a case-insensitive Mongo `$or` text search across fields.
 */
export function buildTextSearch(
  q: string | undefined,
  fields: string[],
): Record<string, unknown> | undefined {
  const term = q?.trim();

  if (!term || fields.length === 0) {
    return undefined;
  }

  const pattern = escapeRegex(term);

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: pattern, $options: 'i' },
    })),
  };
}

export function mergeSearchFilter(
  base: Record<string, unknown>,
  search: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!search) {
    return base;
  }

  return { ...base, ...search };
}
