export const PLACE_UNSET_SENTINEL = 2_147_483_647;

export const PRODUCT_PLACE_FIELDS = [
  'catalogPlace',
  'bestSellerPlace',
  'newArrivalPlace',
  'feBasicsPlace',
] as const;
export type ProductPlaceField = (typeof PRODUCT_PLACE_FIELDS)[number];

const NATURAL_SORT_FIELDS = new Set(['createdAt', 'updatedAt']);

/**
 * Optional merchandising place: lower numbers first, unset values after.
 * Applied for default/newest sorts — explicit price/name/rating sorts stay as requested.
 */
export function resolveProductPlaceSort(options: {
  q?: string;
  sortBy?: string;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isFeBasics?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isMoreToLove?: boolean;
}): ProductPlaceField | null {
  if (options.q?.trim()) return null;

  const sortBy = options.sortBy;
  if (sortBy && (PRODUCT_PLACE_FIELDS as readonly string[]).includes(sortBy)) {
    return sortBy as ProductPlaceField;
  }

  const natural = !sortBy || NATURAL_SORT_FIELDS.has(sortBy);
  if (!natural) return null;

  if (options.isFeBasics) return 'feBasicsPlace';
  if (options.isBestSeller) return 'bestSellerPlace';
  if (options.isNewArrival) return 'newArrivalPlace';
  if (options.isFeatured || options.isTrending || options.isMoreToLove) return null;
  return 'catalogPlace';
}
