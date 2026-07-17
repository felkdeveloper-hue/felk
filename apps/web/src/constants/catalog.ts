export const CATALOG_SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest', sortBy: 'createdAt', sortOrder: 'desc' as const },
  {
    value: 'updatedAt:desc',
    label: 'Recently updated',
    sortBy: 'updatedAt',
    sortOrder: 'desc' as const,
  },
  { value: 'name:asc', label: 'Name A–Z', sortBy: 'name', sortOrder: 'asc' as const },
  { value: 'name:desc', label: 'Name Z–A', sortBy: 'name', sortOrder: 'desc' as const },
  {
    value: 'pricing.price:asc',
    label: 'Price: Low to high',
    sortBy: 'pricing.price',
    sortOrder: 'asc' as const,
  },
  {
    value: 'pricing.price:desc',
    label: 'Price: High to low',
    sortBy: 'pricing.price',
    sortOrder: 'desc' as const,
  },
] as const;

export const POPULAR_SEARCHES = [
  'linen dress',
  'tailored blazer',
  'silk top',
  'new arrivals',
] as const;

export const RECENT_SEARCHES_KEY = 'fe-platform:recent-searches';

export const RECENTLY_VIEWED_KEY = 'fe-platform:recently-viewed';

export const MAX_RECENT_SEARCHES = 8;

export const MAX_RECENTLY_VIEWED = 12;
