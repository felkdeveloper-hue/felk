import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsApi } from '@/services/sdk/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';

const STALE_TIME = 15_000; // keep admin views fresh without a manual reload
const POLL_INTERVAL = 15_000;
const LIVE_STALE = 8_000; // 8s for live visitors

export const analyticsKeys = {
  overview: (f: AnalyticsFilter) => ['analytics', 'overview', f] as const,
  visitors: (f: AnalyticsFilter) => ['analytics', 'visitors', f] as const,
  sessions: (f: AnalyticsFilter) => ['analytics', 'sessions', f] as const,
  pages: (f: AnalyticsFilter) => ['analytics', 'pages', f] as const,
  live: () => ['analytics', 'live'] as const,
  events: (f: AnalyticsFilter & { eventName?: string }) => ['analytics', 'events', f] as const,
  eventNames: (f: AnalyticsFilter) => ['analytics', 'event-names', f] as const,
  eventBreakdown: (f: AnalyticsFilter) => ['analytics', 'event-breakdown', f] as const,
  devices: (f: AnalyticsFilter) => ['analytics', 'devices', f] as const,
  geo: (f: AnalyticsFilter) => ['analytics', 'geo', f] as const,
  traffic: (f: AnalyticsFilter) => ['analytics', 'traffic', f] as const,
  products: (f: AnalyticsFilter) => ['analytics', 'products', f] as const,
  productInterest: (id: string, f: AnalyticsFilter) =>
    ['analytics', 'product-interest', id, f] as const,
  cart: (f: AnalyticsFilter) => ['analytics', 'cart', f] as const,
  wishlist: (f: AnalyticsFilter) => ['analytics', 'wishlist', f] as const,
  recovery: (f: AnalyticsFilter) => ['analytics', 'recovery', f] as const,
  returning: (f: AnalyticsFilter) => ['analytics', 'returning', f] as const,
  timeline: (userId: string) => ['analytics', 'timeline', userId] as const,
  replay: (sessionId: string) => ['analytics', 'replay', sessionId] as const,
  search: (f: AnalyticsFilter) => ['analytics', 'search', f] as const,
  funnel: (f: AnalyticsFilter) => ['analytics', 'funnel', f] as const,
  checkout: (f: AnalyticsFilter) => ['analytics', 'checkout', f] as const,
  insights: (id: string, f: AnalyticsFilter) => ['analytics', 'insights', id, f] as const,
  revenue: (f: AnalyticsFilter) => ['analytics', 'revenue', f] as const,
  activity: () => ['analytics', 'activity'] as const,
};

export function useAnalyticsOverview(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.overview(filter),
    queryFn: () => adminAnalyticsApi.getOverview(filter),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useAnalyticsVisitors(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.visitors(filter),
    queryFn: () => adminAnalyticsApi.getVisitors(filter),
    staleTime: STALE_TIME,
  });
}

export function useAnalyticsSessions(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.sessions(filter),
    queryFn: () => adminAnalyticsApi.getSessions(filter),
    staleTime: STALE_TIME,
  });
}

export function useAnalyticsPages(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.pages(filter),
    queryFn: () => adminAnalyticsApi.getPages(filter),
    staleTime: STALE_TIME,
  });
}

export function useLiveVisitors() {
  return useQuery({
    queryKey: analyticsKeys.live(),
    queryFn: () => adminAnalyticsApi.getLiveVisitors(),
    staleTime: LIVE_STALE,
    refetchInterval: LIVE_STALE,
  });
}

export function useAnalyticsEvents(filter: AnalyticsFilter & { eventName?: string } = {}) {
  return useQuery({
    queryKey: analyticsKeys.events(filter),
    queryFn: () => adminAnalyticsApi.getEvents(filter),
    staleTime: STALE_TIME,
  });
}

export function useEventNames(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.eventNames(filter),
    queryFn: () => adminAnalyticsApi.getEventNames(filter),
    staleTime: STALE_TIME * 5,
  });
}

export function useEventBreakdown(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.eventBreakdown(filter),
    queryFn: () => adminAnalyticsApi.getEventBreakdown(filter),
    staleTime: STALE_TIME,
  });
}

export function useDeviceBreakdown(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.devices(filter),
    queryFn: () => adminAnalyticsApi.getDeviceBreakdown(filter),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useGeoBreakdown(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.geo(filter),
    queryFn: () => adminAnalyticsApi.getGeoBreakdown(filter),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useTrafficSources(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.traffic(filter),
    queryFn: () => adminAnalyticsApi.getTrafficSources(filter),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useProductAnalytics(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.products(filter),
    queryFn: () => adminAnalyticsApi.getProductAnalytics(filter),
    staleTime: STALE_TIME,
  });
}

export function useProductInterest(productId: string, filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.productInterest(productId, filter),
    queryFn: () => adminAnalyticsApi.getProductInterest(productId, filter),
    staleTime: STALE_TIME,
    enabled: Boolean(productId),
  });
}

export function useCartAnalytics(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.cart(filter),
    queryFn: () => adminAnalyticsApi.getCartAnalytics(filter),
    staleTime: STALE_TIME,
  });
}

export function useWishlistAnalytics(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.wishlist(filter),
    queryFn: () => adminAnalyticsApi.getWishlistAnalytics(filter),
    staleTime: STALE_TIME,
  });
}

export function usePaymentRecovery(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.recovery(filter),
    queryFn: () => adminAnalyticsApi.getPaymentRecovery(filter),
    staleTime: STALE_TIME,
  });
}

export function useReturningJourney(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.returning(filter),
    queryFn: () => adminAnalyticsApi.getReturningJourney(filter),
    staleTime: STALE_TIME,
  });
}

export function useCustomerTimeline(userId: string) {
  return useQuery({
    queryKey: analyticsKeys.timeline(userId),
    queryFn: () => adminAnalyticsApi.getCustomerTimeline(userId),
    staleTime: STALE_TIME,
    enabled: Boolean(userId),
  });
}

export function useSessionReplay(sessionId: string | null) {
  return useQuery({
    queryKey: analyticsKeys.replay(sessionId ?? ''),
    queryFn: () => adminAnalyticsApi.getSessionReplay(sessionId!),
    staleTime: STALE_TIME,
    enabled: Boolean(sessionId),
  });
}

export function useSearchAnalytics(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.search(filter),
    queryFn: () => adminAnalyticsApi.getSearchAnalytics(filter),
    staleTime: STALE_TIME,
  });
}

export function useProductFunnel(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.funnel(filter),
    queryFn: () => adminAnalyticsApi.getProductFunnel(filter),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useCheckoutAbandon(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.checkout(filter),
    queryFn: () => adminAnalyticsApi.getCheckoutAbandon(filter),
    staleTime: STALE_TIME,
  });
}

export function useProductInsights(productId: string, filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.insights(productId, filter),
    queryFn: () => adminAnalyticsApi.getProductInsights(productId, filter),
    staleTime: STALE_TIME,
    enabled: Boolean(productId),
  });
}

export function useRevenueDashboard(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.revenue(filter),
    queryFn: () => adminAnalyticsApi.getRevenueDashboard(filter),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useActivityFeed() {
  return useQuery({
    queryKey: analyticsKeys.activity(),
    queryFn: () => adminAnalyticsApi.getActivityFeed(50),
    staleTime: LIVE_STALE,
    refetchInterval: LIVE_STALE,
  });
}
