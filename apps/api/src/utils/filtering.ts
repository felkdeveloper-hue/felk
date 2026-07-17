/**
 * Build a Mongo-style filter object from allowlisted query keys.
 * Does not execute queries — infrastructure helper only.
 */
export function buildFilter<T extends Record<string, unknown>>(
  query: Record<string, unknown>,
  allowedFields: readonly (keyof T & string)[],
): Partial<T> {
  const filter: Partial<T> = {};

  for (const field of allowedFields) {
    const value = query[field];

    if (value === undefined || value === null || value === '') {
      continue;
    }

    filter[field] = value as T[typeof field];
  }

  return filter;
}

export function applyEqualityFilters(
  query: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  return buildFilter(query, fields);
}
