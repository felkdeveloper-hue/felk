/**
 * Build a Mongo status clause that is safe for both find() and aggregation $match.
 * Passing a JS array as `{ status: ['active', 'out_of_stock'] }` matches nothing in $match
 * (equality to an array), which emptied the Women shop whenever warmup used that shape.
 */
export function catalogStatusMatch(
  status?: string | string[],
  excludeStatuses?: string[],
): { status: string | { $in: string[] } | { $nin: string[] } } | undefined {
  if (status) {
    const statuses = (Array.isArray(status) ? status : [status]).filter(Boolean);
    if (statuses.length === 1) return { status: statuses[0] };
    if (statuses.length > 1) return { status: { $in: statuses } };
  }
  if (excludeStatuses?.length) {
    return { status: { $nin: excludeStatuses } };
  }
  return undefined;
}
