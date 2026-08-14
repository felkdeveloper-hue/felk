export type WidgetCategory =
  'overview' | 'revenue' | 'audience' | 'engagement' | 'commerce' | 'acquisition' | 'operations';

export interface WidgetDefinitionMeta {
  id: string;
  name: string;
  description?: string;
  category: WidgetCategory;
  /** Default grid size (12-col desktop) */
  defaultSize: { w: number; h: number; minW?: number; minH?: number };
  permissions: string[];
  settingsSchema?: Record<string, unknown>;
}

const widgets: WidgetDefinitionMeta[] = [
  {
    id: 'revenue',
    name: 'Revenue',
    description: 'Today, yesterday, week, month, and year revenue',
    category: 'revenue',
    defaultSize: { w: 12, h: 4, minW: 6, minH: 3 },
    permissions: ['analytics.view', 'reports.view'],
    settingsSchema: {
      period: { type: 'string', enum: ['today', '7d', '30d', '90d'] },
      displayMode: { type: 'string', enum: ['kpi', 'chart'] },
    },
  },
  {
    id: 'visitors',
    name: 'Visitors',
    description: 'Unique visitors with period delta',
    category: 'audience',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'sessions',
    name: 'Sessions',
    description: 'Session volume and engagement',
    category: 'audience',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'products',
    name: 'Products',
    description: 'Product views and conversion snapshot',
    category: 'commerce',
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'top_products',
    name: 'Top Products',
    description: 'Most viewed and purchased products',
    category: 'commerce',
    defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'search',
    name: 'Search',
    description: 'Search volume and zero-result rate',
    category: 'engagement',
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'funnel',
    name: 'Funnel',
    description: 'Product conversion funnel stages',
    category: 'commerce',
    defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'devices',
    name: 'Devices',
    description: 'Device type breakdown',
    category: 'audience',
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'geo',
    name: 'Geography',
    description: 'Top countries by visitors',
    category: 'acquisition',
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'traffic',
    name: 'Sources',
    description: 'Where visitors come from — Instagram, ads, search, and more',
    category: 'acquisition',
    defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'live_activity',
    name: 'Live Activity',
    description: 'Active visitors right now',
    category: 'engagement',
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'checkout',
    name: 'Checkout',
    description: 'Abandoned checkout and recovery',
    category: 'commerce',
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'wishlist',
    name: 'Wishlist',
    description: 'Wishlist adds and top items',
    category: 'commerce',
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'cart',
    name: 'Cart',
    description: 'Cart adds, abandons, and AOV',
    category: 'commerce',
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 },
    permissions: ['analytics.view'],
  },
  {
    id: 'recent_activity',
    name: 'Recent Activity',
    description: 'Latest storefront events',
    category: 'engagement',
    defaultSize: { w: 6, h: 5, minW: 4, minH: 3 },
    permissions: ['analytics.view'],
  },
  {
    id: 'ops_orders',
    name: 'Orders',
    description: 'Recent order volume (ops)',
    category: 'operations',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
    permissions: ['orders.view', 'orders.read'],
  },
  {
    id: 'ops_customers',
    name: 'Customers',
    description: 'Customer count (ops)',
    category: 'operations',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
    permissions: ['customers.view'],
  },
];

const byId = new Map(widgets.map((w) => [w.id, w]));

export function listWidgetDefinitions(): WidgetDefinitionMeta[] {
  return [...widgets];
}

export function getWidgetDefinition(id: string): WidgetDefinitionMeta | undefined {
  return byId.get(id);
}

/** Register additional widgets at runtime (future pages / plugins). */
export function registerDashboardWidget(def: WidgetDefinitionMeta): void {
  const idx = widgets.findIndex((w) => w.id === def.id);
  if (idx >= 0) widgets[idx] = def;
  else widgets.push(def);
  byId.set(def.id, def);
}

export function filterWidgetsByPermissions(permissionKeys: string[]): WidgetDefinitionMeta[] {
  const set = new Set(permissionKeys);
  return widgets.filter((w) => !w.permissions.length || w.permissions.some((p) => set.has(p)));
}
