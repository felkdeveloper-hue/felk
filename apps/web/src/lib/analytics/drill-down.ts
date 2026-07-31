import { ADMIN_ROUTES } from '@/constants';
import { ANALYTICS_FILTER_KEYS, type AnalyticsFilter } from '@/services/sdk/admin';

/** Registered drill destinations — new pages register here. */
export type DrillDestination =
  | 'overview'
  | 'visitors'
  | 'sessions'
  | 'events'
  | 'pages'
  | 'live'
  | 'devices'
  | 'geo'
  | 'traffic'
  | 'products'
  | 'productDetail'
  | 'cart'
  | 'wishlist'
  | 'recovery'
  | 'returning'
  | 'search'
  | 'funnel'
  | 'activity'
  | 'checkout'
  | 'revenue'
  | 'orders'
  | 'customer';

export interface DrillTrailStep {
  label: string;
  to: string;
  search: Record<string, string | number>;
}

export interface DrillSpec {
  destination: DrillDestination;
  /** Breadcrumb / tooltip label for this step */
  label: string;
  /** Entity id for productDetail / customer */
  entityId?: string;
  /** Extra analytics filters to append (merged over current) */
  append?: Partial<AnalyticsFilter>;
  /** Extra non-analytics search params (orders list, customer tabs) */
  extraSearch?: Record<string, string | number | undefined>;
}

const DESTINATION_PATH: Record<DrillDestination, string | ((entityId: string) => string)> = {
  overview: ADMIN_ROUTES.analytics,
  visitors: ADMIN_ROUTES.analyticsVisitors,
  sessions: ADMIN_ROUTES.analyticsSessions,
  events: ADMIN_ROUTES.analyticsEvents,
  pages: ADMIN_ROUTES.analyticsPages,
  live: ADMIN_ROUTES.analyticsLive,
  devices: ADMIN_ROUTES.analyticsDevices,
  geo: ADMIN_ROUTES.analyticsGeo,
  traffic: ADMIN_ROUTES.analyticsTraffic,
  products: ADMIN_ROUTES.analyticsProducts,
  productDetail: (id) => `/admin/products/${id}`,
  cart: ADMIN_ROUTES.analyticsCart,
  wishlist: ADMIN_ROUTES.analyticsWishlist,
  recovery: ADMIN_ROUTES.analyticsRecovery,
  returning: ADMIN_ROUTES.analyticsReturning,
  search: ADMIN_ROUTES.analyticsSearch,
  funnel: ADMIN_ROUTES.analyticsFunnel,
  activity: ADMIN_ROUTES.analyticsActivity,
  checkout: ADMIN_ROUTES.analyticsCheckout,
  revenue: ADMIN_ROUTES.analyticsRevenue,
  orders: ADMIN_ROUTES.orders,
  customer: (id) => `/admin/customers/${id}`,
};

export const DESTINATION_LABELS: Record<DrillDestination, string> = {
  overview: 'Analytics',
  visitors: 'Visitors',
  sessions: 'Sessions',
  events: 'Events',
  pages: 'Pages',
  live: 'Live',
  devices: 'Devices',
  geo: 'Geography',
  traffic: 'Traffic',
  products: 'Products',
  productDetail: 'Product',
  cart: 'Cart',
  wishlist: 'Wishlist',
  recovery: 'Recovery',
  returning: 'Returning',
  search: 'Search',
  funnel: 'Funnel',
  activity: 'Activity',
  checkout: 'Checkout',
  revenue: 'Revenue',
  orders: 'Orders',
  customer: 'Customer',
};

export function resolveDrillPath(destination: DrillDestination, entityId?: string): string {
  const target = DESTINATION_PATH[destination];
  if (typeof target === 'function') {
    if (!entityId) throw new Error(`Drill destination ${destination} requires entityId`);
    return target(entityId);
  }
  return target;
}

/** Serialize analytics filter for URL search (same contract as useAnalyticsFilters). */
export function analyticsFilterToSearch(
  filter: AnalyticsFilter,
  defaults: Partial<AnalyticsFilter> = {},
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const key of ANALYTICS_FILTER_KEYS) {
    const value = filter[key];
    if (value === undefined || value === null || value === '') continue;
    if (
      key === 'period' &&
      defaults.period &&
      value === defaults.period &&
      !filter.from &&
      !filter.to
    ) {
      continue;
    }
    if (key === 'page' && value === 1) continue;
    out[key] = value as string | number;
  }
  return out;
}

export function encodeTrail(steps: DrillTrailStep[]): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(steps))));
  } catch {
    return '';
  }
}

export function decodeTrail(raw: unknown): DrillTrailStep[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is DrillTrailStep =>
        Boolean(s) &&
        typeof s === 'object' &&
        typeof (s as DrillTrailStep).label === 'string' &&
        typeof (s as DrillTrailStep).to === 'string',
    );
  } catch {
    return [];
  }
}

export function mergeDrillSearch(args: {
  currentFilter: AnalyticsFilter;
  append?: Partial<AnalyticsFilter>;
  extraSearch?: Record<string, string | number | undefined>;
  trail: DrillTrailStep[];
  defaults?: Partial<AnalyticsFilter>;
}): Record<string, string | number> {
  const nextFilter: AnalyticsFilter = {
    ...args.currentFilter,
    ...args.append,
    page: 1,
  };
  for (const [k, v] of Object.entries(args.append ?? {})) {
    if (v === undefined || v === '') {
      delete nextFilter[k as keyof AnalyticsFilter];
    }
  }

  const search: Record<string, string | number> = {
    ...analyticsFilterToSearch(nextFilter, args.defaults ?? {}),
  };

  for (const [k, v] of Object.entries(args.extraSearch ?? {})) {
    if (v !== undefined && v !== '') search[k] = v;
  }

  if (args.trail.length) {
    search._trail = encodeTrail(args.trail);
  }

  return search;
}

export const DRILL_TOOLTIP = 'Click to view details';
