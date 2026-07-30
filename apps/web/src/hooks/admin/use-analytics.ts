import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsApi } from '@/services/sdk/admin';
import type { AnalyticsFilter } from '@/services/sdk/admin';

const STALE_TIME = 60_000; // 1 min for most reports
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
};

export function useAnalyticsOverview(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.overview(filter),
    queryFn: () => adminAnalyticsApi.getOverview(filter),
    staleTime: STALE_TIME,
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
  });
}

export function useGeoBreakdown(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.geo(filter),
    queryFn: () => adminAnalyticsApi.getGeoBreakdown(filter),
    staleTime: STALE_TIME,
  });
}

export function useTrafficSources(filter: AnalyticsFilter = {}) {
  return useQuery({
    queryKey: analyticsKeys.traffic(filter),
    queryFn: () => adminAnalyticsApi.getTrafficSources(filter),
    staleTime: STALE_TIME,
  });
}
