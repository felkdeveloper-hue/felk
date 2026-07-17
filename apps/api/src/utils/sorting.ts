export type SortOrder = 'asc' | 'desc';

export interface SortSpec {
  sortBy: string;
  sortOrder: SortOrder;
}

/**
 * Parse sort query into a Mongo-compatible sort object.
 */
export function parseSort(
  input: { sortBy?: string; sortOrder?: string },
  allowedFields: string[],
  fallback: SortSpec = { sortBy: 'createdAt', sortOrder: 'desc' },
): Record<string, 1 | -1> {
  const sortBy =
    input.sortBy && allowedFields.includes(input.sortBy) ? input.sortBy : fallback.sortBy;

  const sortOrder: SortOrder =
    input.sortOrder === 'asc' || input.sortOrder === 'desc' ? input.sortOrder : fallback.sortOrder;

  return { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
}
