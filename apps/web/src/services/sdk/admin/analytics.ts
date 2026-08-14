import { http, httpClient } from '@/lib/http-client';
import type { PaginatedResult } from '@/types';

export type AnalyticsPeriod = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';

export interface AnalyticsFilter {
  period?: AnalyticsPeriod;
  from?: string;
  to?: string;
  userId?: string;
  country?: string;
  city?: string;
  browser?: string;
  device?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  productId?: string;
  category?: string;
  brandId?: string;
  orderStatus?: string;
  trafficSource?: string;
  sessionId?: string;
  eventName?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const ANALYTICS_FILTER_KEYS = [
  'period',
  'from',
  'to',
  'userId',
  'country',
  'city',
  'browser',
  'device',
  'productId',
  'category',
  'brandId',
  'orderStatus',
  'trafficSource',
  'sessionId',
  'eventName',
  'q',
  'page',
  'limit',
] as const satisfies ReadonlyArray<keyof AnalyticsFilter>;

export interface KpiMetric {
  value: number;
  prev: number;
  pctChange: number;
}

export interface OverviewData {
  period: { from: string; to: string };
  totalVisitors: KpiMetric;
  uniqueVisitors: KpiMetric;
  loggedInUsers: KpiMetric;
  newUsersToday: number;
  returningVisitors: KpiMetric;
  activeNow: number;
  sessionsToday: number;
  avgSessionDurationMs: KpiMetric;
  bounceRate: KpiMetric;
  totalPageViews: KpiMetric;
  avgPagesPerSession: KpiMetric;
}

export interface VisitorRow {
  _id: string;
  visitorId: string;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  geo: {
    country?: string | null;
    countryCode?: string | null;
    city?: string | null;
    region?: string | null;
  };
  device: {
    type: string;
    browser?: string | null;
    os?: string | null;
    screenResolution?: string | null;
    language?: string | null;
  };
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  trafficSource: string;
  sourceLabel?: string;
  sourceChannel?: string;
  sourceDetail?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  totalVisits: number;
  isReturning: boolean;
}

export interface SessionRow {
  _id: string;
  sessionId: string;
  visitorId: string;
  userId?: string | null;
  customerEmail?: string | null;
  startedAt: string;
  endedAt?: string | null;
  lastActiveAt: string;
  durationMs?: number | null;
  activeMs?: number;
  idleMs?: number;
  avgTimePerPageMs?: number | null;
  isActive: boolean;
  entryPage?: string | null;
  exitPage?: string | null;
  lastPage?: string | null;
  pageCount: number;
  clickCount: number;
  maxScrollDepth: number;
  deviceType: string;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  isBounce: boolean;
}

export interface PageStat {
  path: string;
  totalViews: number;
  uniqueViews: number;
  avgTimeOnPageMs: number;
  exitRate: number;
  entryRate: number;
}

export interface LiveVisitor {
  sessionId: string;
  visitorId: string;
  userId: string | null;
  currentPage: string | null;
  timeOnSiteMs: number;
  country: string | null;
  deviceType: string;
  browser: string | null;
  startedAt: string;
  lastActiveAt: string;
}

export interface EventRow {
  _id: string;
  eventId: string;
  name: string;
  sessionId?: string | null;
  visitorId?: string | null;
  userId?: string | null;
  path?: string | null;
  properties?: Record<string, unknown>;
  occurredAt: string;
}

export interface Breakdown {
  label: string;
  count: number;
  pct: number;
}

export interface DeviceBreakdownData {
  deviceTypes: Breakdown[];
  browsers: Breakdown[];
  operatingSystems: Breakdown[];
}

export interface GeoBreakdownData {
  countries: Array<{
    country: string | null;
    countryCode: string | null;
    count: number;
    pct: number;
  }>;
  cities: Array<{
    city: string | null;
    country: string | null;
    countryCode: string | null;
    count: number;
  }>;
}

export interface TrafficSourceRow {
  source: string;
  label: string;
  channel?: string;
  count: number;
  pct: number;
}

export interface EventBreakdownRow {
  name: string;
  count: number;
}

function buildQuery(filter: AnalyticsFilter & { eventName?: string }): string {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, String(v));
  });
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const adminAnalyticsApi = {
  getOverview(filter: AnalyticsFilter = {}): Promise<OverviewData> {
    return http.get<OverviewData>(`/analytics/admin/overview${buildQuery(filter)}`);
  },

  getVisitors(filter: AnalyticsFilter = {}): Promise<PaginatedResult<VisitorRow>> {
    return http.getPaginated<VisitorRow>(`/analytics/admin/visitors${buildQuery(filter)}`);
  },

  getSessions(filter: AnalyticsFilter = {}): Promise<PaginatedResult<SessionRow>> {
    return http.getPaginated<SessionRow>(`/analytics/admin/sessions${buildQuery(filter)}`);
  },

  getPages(filter: AnalyticsFilter = {}): Promise<PaginatedResult<PageStat>> {
    return http.getPaginated<PageStat>(`/analytics/admin/pages${buildQuery(filter)}`);
  },

  getLiveVisitors(): Promise<LiveVisitor[]> {
    return http.get<LiveVisitor[]>('/analytics/admin/live');
  },

  getEvents(
    filter: AnalyticsFilter & { eventName?: string } = {},
  ): Promise<PaginatedResult<EventRow>> {
    return http.getPaginated<EventRow>(`/analytics/admin/events${buildQuery(filter)}`);
  },

  getEventNames(filter: AnalyticsFilter = {}): Promise<string[]> {
    return http.get<string[]>(`/analytics/admin/events/names${buildQuery(filter)}`);
  },

  getEventBreakdown(filter: AnalyticsFilter = {}): Promise<EventBreakdownRow[]> {
    return http.get<EventBreakdownRow[]>(`/analytics/admin/events/breakdown${buildQuery(filter)}`);
  },

  getDeviceBreakdown(filter: AnalyticsFilter = {}): Promise<DeviceBreakdownData> {
    return http.get<DeviceBreakdownData>(`/analytics/admin/devices${buildQuery(filter)}`);
  },

  getGeoBreakdown(filter: AnalyticsFilter = {}): Promise<GeoBreakdownData> {
    return http.get<GeoBreakdownData>(`/analytics/admin/geo${buildQuery(filter)}`);
  },

  getTrafficSources(filter: AnalyticsFilter = {}): Promise<TrafficSourceRow[]> {
    return http.get<TrafficSourceRow[]>(`/analytics/admin/traffic${buildQuery(filter)}`);
  },

  getProductAnalytics(filter: AnalyticsFilter = {}): Promise<ProductAnalyticsData> {
    return http.get<ProductAnalyticsData>(`/analytics/admin/products${buildQuery(filter)}`);
  },

  getProductInterest(
    productId: string,
    filter: AnalyticsFilter = {},
  ): Promise<ProductInterestData> {
    return http.get<ProductInterestData>(
      `/analytics/admin/products/${productId}/interest${buildQuery(filter)}`,
    );
  },

  getCartAnalytics(filter: AnalyticsFilter = {}): Promise<CartAnalyticsData> {
    return http.get<CartAnalyticsData>(`/analytics/admin/cart${buildQuery(filter)}`);
  },

  getWishlistAnalytics(filter: AnalyticsFilter = {}): Promise<WishlistAnalyticsData> {
    return http.get<WishlistAnalyticsData>(`/analytics/admin/wishlist${buildQuery(filter)}`);
  },

  getPaymentRecovery(filter: AnalyticsFilter = {}): Promise<PaymentRecoveryData> {
    return http.get<PaymentRecoveryData>(`/analytics/admin/recovery${buildQuery(filter)}`);
  },

  getReturningJourney(filter: AnalyticsFilter = {}): Promise<ReturningJourneyData> {
    return http.get<ReturningJourneyData>(`/analytics/admin/returning${buildQuery(filter)}`);
  },

  getCustomerTimeline(userId: string): Promise<TimelineItem[]> {
    return http.get<TimelineItem[]>(`/analytics/admin/customers/${userId}/timeline`);
  },

  getSessionReplay(sessionId: string): Promise<SessionReplayData> {
    return http.get<SessionReplayData>(`/analytics/admin/sessions/${sessionId}/replay`);
  },

  getSearchAnalytics(filter: AnalyticsFilter = {}): Promise<SearchAnalyticsData> {
    return http.get<SearchAnalyticsData>(`/analytics/admin/search${buildQuery(filter)}`);
  },

  getProductFunnel(filter: AnalyticsFilter = {}): Promise<ProductFunnelData> {
    return http.get<ProductFunnelData>(`/analytics/admin/funnel${buildQuery(filter)}`);
  },

  getCheckoutAbandon(filter: AnalyticsFilter = {}): Promise<CheckoutAbandonData> {
    return http.get<CheckoutAbandonData>(`/analytics/admin/checkout${buildQuery(filter)}`);
  },

  getProductInsights(
    productId: string,
    filter: AnalyticsFilter = {},
  ): Promise<ProductInsightsData> {
    return http.get<ProductInsightsData>(
      `/analytics/admin/products/${productId}/insights${buildQuery(filter)}`,
    );
  },

  getRevenueDashboard(filter: AnalyticsFilter = {}): Promise<RevenueDashboardData> {
    return http.get<RevenueDashboardData>(`/analytics/admin/revenue${buildQuery(filter)}`);
  },

  getActivityFeed(limit = 50): Promise<ActivityFeedItem[]> {
    return http.get<ActivityFeedItem[]>(`/analytics/admin/activity?limit=${limit}`);
  },

  listExportReports(): Promise<AnalyticsExportReportMeta[]> {
    return http.get<AnalyticsExportReportMeta[]>('/analytics/admin/exports/reports');
  },

  listExports(): Promise<AnalyticsExportJob[]> {
    return http.get<AnalyticsExportJob[]>('/analytics/admin/exports');
  },

  getExport(id: string): Promise<AnalyticsExportJob> {
    return http.get<AnalyticsExportJob>(`/analytics/admin/exports/${id}`);
  },

  async createExport(
    body: CreateAnalyticsExportBody,
  ): Promise<AnalyticsExportAsyncResult | { async: false }> {
    const response = await httpClient.post('/analytics/admin/exports', body, {
      responseType: 'blob',
      timeout: 5 * 60 * 1000,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 202,
    });

    const contentType = String(response.headers['content-type'] ?? '');
    if (contentType.includes('application/json')) {
      const text = await (response.data as Blob).text();
      const json = JSON.parse(text) as {
        data?: AnalyticsExportAsyncResult;
        success?: boolean;
      };
      const data = json.data ?? (JSON.parse(text) as AnalyticsExportAsyncResult);
      return { async: true, jobId: data.jobId, status: data.status };
    }

    const disposition = String(response.headers['content-disposition'] ?? '');
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const fileName = match?.[1] ?? `analytics-export.${body.format}`;
    saveBlob(response.data as Blob, fileName);
    return { async: false };
  },

  async downloadExport(id: string): Promise<void> {
    const response = await httpClient.get(`/analytics/admin/exports/${id}/download`, {
      responseType: 'blob',
      timeout: 5 * 60 * 1000,
    });
    const disposition = String(response.headers['content-disposition'] ?? '');
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const fileName = match?.[1] ?? `analytics-export-${id}`;
    saveBlob(response.data as Blob, fileName);
  },

  async waitForExport(
    jobId: string,
    options?: {
      intervalMs?: number;
      maxAttempts?: number;
      onProgress?: (job: AnalyticsExportJob) => void;
    },
  ): Promise<AnalyticsExportJob> {
    const intervalMs = options?.intervalMs ?? 1500;
    const maxAttempts = options?.maxAttempts ?? 80;
    for (let i = 0; i < maxAttempts; i++) {
      const job = await this.getExport(jobId);
      options?.onProgress?.(job);
      if (job.status === 'ready' || job.status === 'failed') return job;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('Export timed out — check Export History');
  },
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type AnalyticsExportFormat = 'csv' | 'xlsx' | 'pdf';
export type AnalyticsExportScope = 'all' | 'page';
export type AnalyticsExportStatus = 'processing' | 'ready' | 'failed';

export interface AnalyticsExportReportMeta {
  id: string;
  title: string;
  description?: string;
}

export interface CreateAnalyticsExportBody {
  reportType: string;
  format: AnalyticsExportFormat;
  filter?: AnalyticsFilter;
  scope?: AnalyticsExportScope;
  columns?: string[];
  drillLabel?: string;
}

export interface AnalyticsExportAsyncResult {
  async: true;
  jobId: string;
  status: string;
}

export interface AnalyticsExportJob {
  id: string;
  reportType: string;
  reportTitle: string;
  format: AnalyticsExportFormat;
  status: AnalyticsExportStatus;
  recordCount: number;
  fileName?: string | null;
  error?: string | null;
  drillLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  downloadAvailable: boolean;
}

export interface ProductCountRow {
  productId: string;
  productName: string;
  count: number;
}

export interface ProductConversionRow {
  productId: string;
  productName: string;
  views: number;
  carts: number;
  purchases: number;
  cartRate: number;
  conversionRate: number;
}

export interface ProductAnalyticsData {
  mostViewed: ProductCountRow[];
  mostClicked: ProductCountRow[];
  mostAddedToCart: ProductCountRow[];
  mostWishlisted: ProductCountRow[];
  conversion: ProductConversionRow[];
}

export interface ProductInterestData {
  productId: string;
  productName: string;
  views: number;
  clicks: number;
  wishlistAdds: number;
  cartAdds: number;
  purchases: number;
}

export interface CartAnalyticsData {
  cartAdditions: number;
  cartRemovals: number;
  abandonedCarts: number;
  avgCartValue: number;
  mostAbandonedProducts: ProductCountRow[];
  avgTimeToAbandonMs: number | null;
}

export interface WishlistAnalyticsData {
  mostWishlisted: ProductCountRow[];
  daily: Array<{ date: string; adds: number; removals: number }>;
  removals: number;
  largestWishlists: Array<{
    userId: string;
    email: string | null;
    name: string | null;
    count: number;
  }>;
}

export interface PaymentRecoveryData {
  funnel: {
    checkoutStarted: number;
    paymentPageReached: number;
    paymentFailed: number;
    returnedAfterFail: number;
    paymentSuccessful: number;
    recovered: number;
  };
  recoveryRate: number;
  medianRecoveryMs: number | null;
  avgRecoveryMs: number | null;
}

export interface ReturningJourneyData {
  buckets: Array<{ bucket: string; label: string; count: number }>;
  total: number;
}

export interface TimelineItem {
  id: string;
  at: string;
  type: 'page' | 'event';
  name: string;
  label: string;
  sessionId?: string | null;
  path?: string | null;
  properties?: Record<string, unknown>;
  deltaMs?: number | null;
  scrollDepth?: number | null;
  timeOnPageMs?: number | null;
}

export interface SessionReplayData {
  session: Record<string, unknown> | null;
  summary?: {
    durationMs: number | null;
    activeMs: number | null;
    pageCount: number;
    clickCount: number;
    maxScrollDepth: number;
    deviceType: string | null;
    browser: string | null;
  } | null;
  steps: TimelineItem[];
}

export interface SearchKeywordRow {
  query: string;
  searches: number;
  zeroResults: number;
  resultClicks: number;
  suggestionClicks: number;
  cart: number;
  purchased: number;
  ctr: number;
  abandonRate: number;
}

export interface SearchAnalyticsData {
  keywords: SearchKeywordRow[];
  zeroResultSearches: Array<{ query: string; count: number }>;
  totals: {
    searches: number;
    zeroResults: number;
    suggestionClicks: number;
    resultClicks: number;
  };
}

export interface ProductFunnelData {
  stages: Array<{
    key: string;
    label: string;
    count: number;
    dropOffPct: number;
    conversionFromTop: number;
  }>;
  filters: { productId: string | null; category: string | null };
}

export interface CheckoutAbandonData {
  funnel: {
    checkoutStarted: number;
    shippingReached: number;
    paymentReached: number;
    reviewReached: number;
    abandoned: number;
    paid: number;
  };
  exitSteps: Array<{ step: string; count: number }>;
  abandonRate: number;
  recoveryRate: number;
  recovered: number;
  revenueRecovered: number;
  avgTimeUntilReturnMs: number | null;
}

export interface ProductInsightsData {
  productId: string;
  views: number;
  uniqueVisitors: number;
  wishlistAdds: number;
  cartAdds: number;
  purchases: number;
  conversionRate: number;
  revenue: number;
  repeatBuyers: number;
  avgTimeViewingMs: number;
  avgScrollDepth: number;
  buyers: number;
}

export interface RevenueDashboardData {
  today: number;
  yesterday: number;
  week: number;
  month: number;
  year: number;
  todayOrders?: number;
  yesterdayOrders?: number;
  weekOrders?: number;
  monthOrders?: number;
  yearOrders?: number;
  periodRevenue: number;
  aov: number;
  orderCount: number;
  trend: Array<{ date: string; revenue: number }>;
  topProducts: Array<{ productId: string; productName: string; revenue: number; qty: number }>;
  byTrafficSource: Array<{
    source: string;
    visitors: number;
    orders: number;
    revenue: number;
    conversion: number;
  }>;
  byDevice: Array<{ device: string; orders: number; revenue: number }>;
  byCountry: Array<{ country: string; orders: number; revenue: number }>;
}

export interface ActivityFeedItem {
  id: string;
  at: string;
  name: string;
  label: string;
  userName?: string | null;
  productName?: string | null;
  path?: string | null;
  sessionId?: string | null;
}
