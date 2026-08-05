import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import {
  getOverview,
  getVisitors,
  getSessions,
  getPages,
  getEvents,
  getDeviceBreakdown,
  getGeoBreakdown,
  getTrafficSources,
  getProductAnalytics,
  getCartAnalytics,
  getWishlistAnalytics,
  getPaymentRecovery,
  getReturningJourney,
  getSearchAnalytics,
  getProductFunnel,
  getCheckoutAbandonAnalytics,
  getRevenueDashboard,
  getActivityFeed,
} from '@/services/platform-analytics/index.js';
import type { ExportColumn, ExportFetchContext, ExportReportDefinition } from './export.types.js';
import { MAX_EXPORT_ROWS } from './export.types.js';

function cols(defs: Array<[string, string]>): ExportColumn[] {
  return defs.map(([key, header]) => ({ key, header }));
}

function pickColumns(all: ExportColumn[], selected?: string[]): ExportColumn[] {
  if (!selected?.length) return all;
  const set = new Set(selected);
  const filtered = all.filter((c) => set.has(c.key));
  return filtered.length ? filtered : all;
}

function pageFilter(ctx: ExportFetchContext, _defaultLimit = 100): AnalyticsFilter {
  if (ctx.scope === 'page') {
    return {
      ...ctx.filter,
      page: ctx.filter.page ?? 1,
      limit: Math.min(ctx.filter.limit ?? 20, 200),
    };
  }
  return {
    ...ctx.filter,
    page: 1,
    limit: MAX_EXPORT_ROWS,
  };
}

async function fetchAllPages<T>(
  fetchPage: (
    f: AnalyticsFilter,
  ) => Promise<{ data: T[]; meta?: { totalPages?: number; hasNextPage?: boolean } }>,
  filter: AnalyticsFilter,
): Promise<T[]> {
  const limit = Math.min(filter.limit ?? 500, 500);
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const result = await fetchPage({ ...filter, page, limit });
    rows.push(...result.data);
    if (rows.length >= MAX_EXPORT_ROWS) break;
    const hasNext =
      result.meta?.hasNextPage ??
      (result.meta?.totalPages != null
        ? page < result.meta.totalPages
        : result.data.length >= limit);
    if (!hasNext || !result.data.length) break;
    page += 1;
  }
  return rows.slice(0, MAX_EXPORT_ROWS);
}

function asRows(items: unknown[]): Record<string, unknown>[] {
  return items.map((item) => {
    if (item && typeof item === 'object') return item as Record<string, unknown>;
    return { value: item };
  });
}

const reports: ExportReportDefinition[] = [
  {
    id: 'overview',
    title: 'Analytics Overview',
    sheets: [
      {
        name: 'Summary',
        columns: cols([
          ['metric', 'Metric'],
          ['value', 'Value'],
          ['prev', 'Previous'],
          ['pctChange', 'Change %'],
        ]),
        fetch: async (ctx) => {
          const d = await getOverview(ctx.filter);
          return [
            {
              metric: 'Total Visitors',
              value: d.totalVisitors.value,
              prev: d.totalVisitors.prev,
              pctChange: d.totalVisitors.pctChange,
            },
            {
              metric: 'Logged-in Users',
              value: d.loggedInUsers.value,
              prev: d.loggedInUsers.prev,
              pctChange: d.loggedInUsers.pctChange,
            },
            {
              metric: 'Returning Visitors',
              value: d.returningVisitors.value,
              prev: d.returningVisitors.prev,
              pctChange: d.returningVisitors.pctChange,
            },
            {
              metric: 'Page Views',
              value: d.totalPageViews.value,
              prev: d.totalPageViews.prev,
              pctChange: d.totalPageViews.pctChange,
            },
            {
              metric: 'Bounce Rate %',
              value: d.bounceRate.value,
              prev: d.bounceRate.prev,
              pctChange: d.bounceRate.pctChange,
            },
            {
              metric: 'Avg Session Duration Ms',
              value: d.avgSessionDurationMs.value,
              prev: d.avgSessionDurationMs.prev,
              pctChange: d.avgSessionDurationMs.pctChange,
            },
            { metric: 'Active Now', value: d.activeNow, prev: '', pctChange: '' },
            { metric: 'Sessions Today', value: d.sessionsToday, prev: '', pctChange: '' },
          ];
        },
      },
    ],
    getKpis: async (ctx) => {
      const d = await getOverview(ctx.filter);
      return [
        { label: 'Visitors', value: d.totalVisitors.value },
        { label: 'Page Views', value: d.totalPageViews.value },
        { label: 'Bounce Rate', value: `${d.bounceRate.value}%` },
        { label: 'Active Now', value: d.activeNow },
      ];
    },
  },
  {
    id: 'visitors',
    title: 'Visitors Report',
    sheets: [
      {
        name: 'Visitors',
        columns: cols([
          ['visitorId', 'Visitor ID'],
          ['userId', 'User ID'],
          ['country', 'Country'],
          ['city', 'City'],
          ['device', 'Device'],
          ['browser', 'Browser'],
          ['trafficSource', 'Traffic Source'],
          ['totalVisits', 'Visits'],
          ['isReturning', 'Returning'],
          ['lastSeenAt', 'Last Seen'],
        ]),
        fetch: async (ctx) => {
          const filter = pageFilter(ctx);
          const rows =
            ctx.scope === 'page'
              ? (await getVisitors(filter)).data
              : await fetchAllPages(getVisitors, filter);
          return rows.map((r) => ({
            visitorId: r.visitorId,
            userId: r.userId ? String(r.userId) : '',
            country: r.geo?.countryCode ?? r.geo?.country ?? '',
            city: r.geo?.city ?? '',
            device: r.device?.type ?? '',
            browser: r.device?.browser ?? '',
            trafficSource: r.trafficSource,
            totalVisits: r.totalVisits,
            isReturning: r.isReturning,
            lastSeenAt: r.lastSeenAt,
          }));
        },
      },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions Report',
    sheets: [
      {
        name: 'Sessions',
        columns: cols([
          ['sessionId', 'Session ID'],
          ['visitorId', 'Visitor ID'],
          ['userId', 'User ID'],
          ['customerEmail', 'Customer Email'],
          ['deviceType', 'Device'],
          ['browser', 'Browser'],
          ['country', 'Country'],
          ['pageCount', 'Pages'],
          ['clickCount', 'Clicks'],
          ['durationMs', 'Duration Ms'],
          ['activeMs', 'Active Ms'],
          ['startedAt', 'Started'],
          ['entryPage', 'Entry'],
          ['exitPage', 'Exit'],
        ]),
        fetch: async (ctx) => {
          const filter = pageFilter(ctx);
          const rows =
            ctx.scope === 'page'
              ? (await getSessions(filter)).data
              : await fetchAllPages(getSessions, filter);
          return asRows(rows).map((r) => ({
            ...r,
            userId: r.userId ? String(r.userId) : '',
          }));
        },
      },
    ],
  },
  {
    id: 'pages',
    title: 'Pages Report',
    sheets: [
      {
        name: 'Pages',
        columns: cols([
          ['path', 'Path'],
          ['totalViews', 'Views'],
          ['uniqueViews', 'Unique'],
          ['avgTimeOnPageMs', 'Avg Time Ms'],
          ['exitRate', 'Exit Rate'],
          ['entryRate', 'Entry Rate'],
        ]),
        fetch: async (ctx) => {
          const filter = pageFilter(ctx);
          const rows =
            ctx.scope === 'page'
              ? (await getPages(filter)).data
              : await fetchAllPages(getPages, filter);
          return asRows(rows);
        },
      },
    ],
  },
  {
    id: 'events',
    title: 'Events Report',
    sheets: [
      {
        name: 'Events',
        columns: cols([
          ['name', 'Event'],
          ['sessionId', 'Session'],
          ['visitorId', 'Visitor'],
          ['userId', 'User'],
          ['path', 'Path'],
          ['occurredAt', 'Occurred At'],
        ]),
        fetch: async (ctx) => {
          const filter = pageFilter(ctx);
          const rows =
            ctx.scope === 'page'
              ? (await getEvents(filter)).data
              : await fetchAllPages(getEvents, filter);
          return rows.map((r) => ({
            name: r.name,
            sessionId: r.sessionId ?? '',
            visitorId: r.visitorId ?? '',
            userId: r.userId ? String(r.userId) : '',
            path: r.path ?? '',
            occurredAt: r.occurredAt,
          }));
        },
      },
    ],
  },
  {
    id: 'devices',
    title: 'Devices Report',
    sheets: [
      {
        name: 'Device Types',
        columns: cols([
          ['label', 'Device'],
          ['count', 'Count'],
          ['pct', 'Percent'],
        ]),
        fetch: async (ctx) => asRows((await getDeviceBreakdown(ctx.filter)).deviceTypes),
      },
      {
        name: 'Browsers',
        columns: cols([
          ['label', 'Browser'],
          ['count', 'Count'],
          ['pct', 'Percent'],
        ]),
        fetch: async (ctx) => asRows((await getDeviceBreakdown(ctx.filter)).browsers),
      },
      {
        name: 'Operating Systems',
        columns: cols([
          ['label', 'OS'],
          ['count', 'Count'],
          ['pct', 'Percent'],
        ]),
        fetch: async (ctx) => asRows((await getDeviceBreakdown(ctx.filter)).operatingSystems),
      },
    ],
  },
  {
    id: 'geo',
    title: 'Geography Report',
    sheets: [
      {
        name: 'Countries',
        columns: cols([
          ['country', 'Country'],
          ['countryCode', 'Code'],
          ['count', 'Visitors'],
          ['pct', 'Percent'],
        ]),
        fetch: async (ctx) => asRows((await getGeoBreakdown(ctx.filter)).countries),
      },
      {
        name: 'Cities',
        columns: cols([
          ['city', 'City'],
          ['country', 'Country'],
          ['countryCode', 'Code'],
          ['count', 'Visitors'],
        ]),
        fetch: async (ctx) => asRows((await getGeoBreakdown(ctx.filter)).cities),
      },
    ],
  },
  {
    id: 'traffic',
    title: 'Traffic Sources Report',
    sheets: [
      {
        name: 'Sources',
        columns: cols([
          ['source', 'Source'],
          ['label', 'Label'],
          ['count', 'Visitors'],
          ['pct', 'Percent'],
        ]),
        fetch: async (ctx) => asRows(await getTrafficSources(ctx.filter)),
      },
    ],
  },
  {
    id: 'products',
    title: 'Product Analytics Report',
    sheets: [
      {
        name: 'Most Viewed',
        columns: cols([
          ['productId', 'Product ID'],
          ['productName', 'Product'],
          ['count', 'Views'],
        ]),
        fetch: async (ctx) => asRows((await getProductAnalytics(ctx.filter)).mostViewed),
      },
      {
        name: 'Most Clicked',
        columns: cols([
          ['productId', 'Product ID'],
          ['productName', 'Product'],
          ['count', 'Clicks'],
        ]),
        fetch: async (ctx) => asRows((await getProductAnalytics(ctx.filter)).mostClicked),
      },
      {
        name: 'Conversion',
        columns: cols([
          ['productId', 'Product ID'],
          ['productName', 'Product'],
          ['views', 'Views'],
          ['carts', 'Carts'],
          ['purchases', 'Purchases'],
          ['conversionRate', 'Conversion %'],
        ]),
        fetch: async (ctx) => asRows((await getProductAnalytics(ctx.filter)).conversion),
      },
    ],
  },
  {
    id: 'cart',
    title: 'Cart Analytics Report',
    sheets: [
      {
        name: 'Summary',
        columns: cols([
          ['metric', 'Metric'],
          ['value', 'Value'],
        ]),
        fetch: async (ctx) => {
          const d = await getCartAnalytics(ctx.filter);
          return [
            { metric: 'Cart Additions', value: d.cartAdditions },
            { metric: 'Cart Removals', value: d.cartRemovals },
            { metric: 'Abandoned Carts', value: d.abandonedCarts },
            { metric: 'Avg Cart Value', value: d.avgCartValue },
          ];
        },
      },
      {
        name: 'Abandoned Products',
        columns: cols([
          ['productId', 'Product ID'],
          ['productName', 'Product'],
          ['count', 'Count'],
        ]),
        fetch: async (ctx) => asRows((await getCartAnalytics(ctx.filter)).mostAbandonedProducts),
      },
    ],
    getKpis: async (ctx) => {
      const d = await getCartAnalytics(ctx.filter);
      return [
        { label: 'Additions', value: d.cartAdditions },
        { label: 'Abandoned', value: d.abandonedCarts },
        { label: 'Avg Value', value: d.avgCartValue },
      ];
    },
  },
  {
    id: 'wishlist',
    title: 'Wishlist Analytics Report',
    sheets: [
      {
        name: 'Most Wishlisted',
        columns: cols([
          ['productId', 'Product ID'],
          ['productName', 'Product'],
          ['count', 'Adds'],
        ]),
        fetch: async (ctx) => asRows((await getWishlistAnalytics(ctx.filter)).mostWishlisted),
      },
      {
        name: 'Daily',
        columns: cols([
          ['date', 'Date'],
          ['adds', 'Adds'],
          ['removals', 'Removals'],
        ]),
        fetch: async (ctx) => asRows((await getWishlistAnalytics(ctx.filter)).daily),
      },
    ],
  },
  {
    id: 'search',
    title: 'Search Analytics Report',
    sheets: [
      {
        name: 'Keywords',
        columns: cols([
          ['query', 'Keyword'],
          ['searches', 'Searches'],
          ['purchased', 'Purchased'],
          ['cart', 'Cart'],
          ['ctr', 'CTR %'],
          ['abandonRate', 'Abandon %'],
          ['zeroResults', 'Zero Results'],
        ]),
        fetch: async (ctx) => asRows((await getSearchAnalytics(ctx.filter)).keywords),
      },
      {
        name: 'Zero Results',
        columns: cols([
          ['query', 'Keyword'],
          ['count', 'Count'],
        ]),
        fetch: async (ctx) => asRows((await getSearchAnalytics(ctx.filter)).zeroResultSearches),
      },
    ],
    getKpis: async (ctx) => {
      const d = await getSearchAnalytics(ctx.filter);
      return [
        { label: 'Searches', value: d.totals.searches },
        { label: 'Zero Results', value: d.totals.zeroResults },
        { label: 'Result Clicks', value: d.totals.resultClicks },
      ];
    },
  },
  {
    id: 'funnel',
    title: 'Product Funnel Report',
    sheets: [
      {
        name: 'Stages',
        columns: cols([
          ['label', 'Stage'],
          ['count', 'Count'],
          ['dropOffPct', 'Drop-off %'],
          ['conversionFromTop', 'Conversion From Top %'],
        ]),
        fetch: async (ctx) => asRows((await getProductFunnel(ctx.filter)).stages),
      },
    ],
  },
  {
    id: 'checkout',
    title: 'Abandoned Checkout Report',
    sheets: [
      {
        name: 'Summary',
        columns: cols([
          ['metric', 'Metric'],
          ['value', 'Value'],
        ]),
        fetch: async (ctx) => {
          const d = await getCheckoutAbandonAnalytics(ctx.filter);
          return Object.entries(d).map(([metric, value]) => ({
            metric,
            value: typeof value === 'object' ? JSON.stringify(value) : value,
          }));
        },
      },
    ],
  },
  {
    id: 'recovery',
    title: 'Payment Recovery Report',
    sheets: [
      {
        name: 'Summary',
        columns: cols([
          ['metric', 'Metric'],
          ['value', 'Value'],
        ]),
        fetch: async (ctx) => {
          const d = await getPaymentRecovery(ctx.filter);
          return Object.entries(d).map(([metric, value]) => ({
            metric,
            value: typeof value === 'object' ? JSON.stringify(value) : value,
          }));
        },
      },
    ],
  },
  {
    id: 'returning',
    title: 'Returning Journey Report',
    sheets: [
      {
        name: 'Buckets',
        columns: cols([
          ['bucket', 'Bucket'],
          ['label', 'Label'],
          ['count', 'Count'],
        ]),
        fetch: async (ctx) => asRows((await getReturningJourney(ctx.filter)).buckets),
      },
    ],
  },
  {
    id: 'revenue',
    title: 'Revenue Report',
    sheets: [
      {
        name: 'Summary',
        columns: cols([
          ['metric', 'Metric'],
          ['value', 'Value'],
        ]),
        fetch: async (ctx) => {
          const d = await getRevenueDashboard(ctx.filter);
          return [
            { metric: 'Today', value: d.today },
            { metric: 'Yesterday', value: d.yesterday },
            { metric: 'Week', value: d.week },
            { metric: 'Month', value: d.month },
            { metric: 'Year', value: d.year },
            { metric: 'Period Revenue', value: d.periodRevenue },
            { metric: 'AOV', value: d.aov },
            { metric: 'Orders', value: d.orderCount },
          ];
        },
      },
      {
        name: 'Trend',
        columns: cols([
          ['date', 'Date'],
          ['revenue', 'Revenue'],
        ]),
        fetch: async (ctx) => asRows((await getRevenueDashboard(ctx.filter)).trend),
      },
      {
        name: 'Products',
        columns: cols([
          ['productId', 'Product ID'],
          ['productName', 'Product'],
          ['qty', 'Qty'],
          ['revenue', 'Revenue'],
        ]),
        fetch: async (ctx) => asRows((await getRevenueDashboard(ctx.filter)).topProducts),
      },
      {
        name: 'Countries',
        columns: cols([
          ['country', 'Country'],
          ['orders', 'Orders'],
          ['revenue', 'Revenue'],
        ]),
        fetch: async (ctx) => asRows((await getRevenueDashboard(ctx.filter)).byCountry),
      },
      {
        name: 'Devices',
        columns: cols([
          ['device', 'Device'],
          ['orders', 'Orders'],
          ['revenue', 'Revenue'],
        ]),
        fetch: async (ctx) => asRows((await getRevenueDashboard(ctx.filter)).byDevice),
      },
      {
        name: 'Traffic Sources',
        columns: cols([
          ['source', 'Source'],
          ['orders', 'Orders'],
          ['revenue', 'Revenue'],
          ['conversion', 'Conversion'],
        ]),
        fetch: async (ctx) => asRows((await getRevenueDashboard(ctx.filter)).byTrafficSource),
      },
    ],
    getKpis: async (ctx) => {
      const d = await getRevenueDashboard(ctx.filter);
      return [
        { label: 'Period Revenue', value: d.periodRevenue },
        { label: 'Orders', value: d.orderCount },
        { label: 'AOV', value: d.aov },
        { label: 'Today', value: d.today },
      ];
    },
  },
  {
    id: 'activity',
    title: 'Activity Feed Report',
    sheets: [
      {
        name: 'Activity',
        columns: cols([
          ['at', 'Time'],
          ['name', 'Event'],
          ['label', 'Label'],
          ['userName', 'User'],
          ['productName', 'Product'],
          ['path', 'Path'],
          ['sessionId', 'Session'],
        ]),
        fetch: async () => asRows(await getActivityFeed(200)),
      },
    ],
  },
];

const byId = new Map(reports.map((r) => [r.id, r]));

export function listExportReports(): Array<{ id: string; title: string; description?: string }> {
  return reports.map((r) => ({ id: r.id, title: r.title, description: r.description }));
}

export function getExportReport(id: string): ExportReportDefinition | undefined {
  return byId.get(id);
}

export function resolveSheetColumns(
  report: ExportReportDefinition,
  sheetIndex: number,
  selected?: string[],
): ExportColumn[] {
  const sheet = report.sheets[sheetIndex];
  if (!sheet) return [];
  return pickColumns(sheet.columns, selected);
}

/** Register additional report definitions at runtime (future pages). */
export function registerExportReport(def: ExportReportDefinition): void {
  reports.push(def);
  byId.set(def.id, def);
}
