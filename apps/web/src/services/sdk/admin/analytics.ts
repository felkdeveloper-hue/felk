import { http } from '@/lib/http-client';
import type { PaginatedResult } from '@/types';

export interface AnalyticsFilter {
  period?: 'today' | 'yesterday' | '7d' | '30d' | 'custom';
  from?: string;
  to?: string;
  userId?: string;
  country?: string;
  browser?: string;
  device?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  page?: number;
  limit?: number;
}

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
  trafficSource: string;
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
  startedAt: string;
  endedAt?: string | null;
  lastActiveAt: string;
  durationMs?: number | null;
  isActive: boolean;
  entryPage?: string | null;
  exitPage?: string | null;
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
};
