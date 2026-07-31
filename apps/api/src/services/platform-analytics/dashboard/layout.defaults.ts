import type { DashboardWidgetPlacement } from '@/models/analytics/dashboard-layout.model.js';
import { getWidgetDefinition } from './widget.registry.js';

function place(
  widgetId: string,
  x: number,
  y: number,
  overrides?: Partial<DashboardWidgetPlacement>,
): DashboardWidgetPlacement {
  const def = getWidgetDefinition(widgetId);
  const size = def?.defaultSize ?? { w: 3, h: 2 };
  return {
    i: `${widgetId}-${x}-${y}`,
    widgetId,
    x,
    y,
    w: size.w,
    h: size.h,
    minW: size.minW,
    minH: size.minH,
    hidden: false,
    collapsed: false,
    pinned: false,
    settings: { period: '7d' },
    ...overrides,
  };
}

export interface DashboardTemplateMeta {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidgetPlacement[];
}

/** Built-in templates — switching copies into a named layout without wiping personal. */
export const DASHBOARD_TEMPLATES: DashboardTemplateMeta[] = [
  {
    id: 'executive',
    name: 'Executive',
    description: 'Revenue, funnel, and top products for leadership.',
    widgets: [
      place('revenue', 0, 0, { pinned: true, w: 4, h: 3 }),
      place('funnel', 4, 0, { w: 4, h: 5 }),
      place('ops_orders', 8, 0, { w: 4, h: 2 }),
      place('top_products', 0, 3, { w: 6, h: 5 }),
      place('visitors', 8, 2, { w: 4, h: 2 }),
      place('traffic', 6, 5, { w: 6, h: 4 }),
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    description: 'Orders, checkout, cart, and live activity.',
    widgets: [
      place('ops_orders', 0, 0, { pinned: true }),
      place('checkout', 3, 0),
      place('cart', 6, 0),
      place('wishlist', 9, 0),
      place('live_activity', 0, 3, { w: 6, h: 4 }),
      place('recent_activity', 6, 3, { w: 6, h: 5 }),
      place('funnel', 0, 7, { w: 6, h: 5 }),
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Traffic, search, geo, devices, and funnel.',
    widgets: [
      place('traffic', 0, 0, { pinned: true, w: 4, h: 4 }),
      place('search', 4, 0, { w: 4, h: 3 }),
      place('funnel', 8, 0, { w: 4, h: 5 }),
      place('geo', 0, 4, { w: 4, h: 4 }),
      place('devices', 4, 3, { w: 4, h: 4 }),
      place('visitors', 8, 5, { w: 4, h: 2 }),
    ],
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Live sessions, activity, search, and customers.',
    widgets: [
      place('live_activity', 0, 0, { pinned: true, w: 6, h: 4 }),
      place('recent_activity', 6, 0, { w: 6, h: 5 }),
      place('search', 0, 4, { w: 4, h: 3 }),
      place('sessions', 4, 4),
      place('ops_customers', 7, 4),
      place('checkout', 0, 7),
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Revenue, products, cart, and checkout recovery.',
    widgets: [
      place('revenue', 0, 0, { pinned: true, w: 6, h: 3 }),
      place('top_products', 6, 0, { w: 6, h: 5 }),
      place('cart', 0, 3),
      place('checkout', 3, 3),
      place('wishlist', 6, 5),
      place('funnel', 0, 6, { w: 6, h: 5 }),
    ],
  },
];

/** Role → default template id (copied into personal on first visit). */
export const ROLE_DEFAULT_TEMPLATE: Record<string, string> = {
  super_admin: 'executive',
  admin: 'executive',
  manager: 'operations',
  marketing_manager: 'marketing',
  customer_support: 'support',
  finance: 'sales',
  inventory_manager: 'operations',
  warehouse_staff: 'operations',
};

export function getTemplate(id: string): DashboardTemplateMeta | undefined {
  return DASHBOARD_TEMPLATES.find((t) => t.id === id);
}

export function getRoleDefaultWidgets(roleKey: string): DashboardWidgetPlacement[] {
  const templateId = ROLE_DEFAULT_TEMPLATE[roleKey] ?? 'executive';
  const template = getTemplate(templateId);
  return (template?.widgets ?? getTemplate('executive')!.widgets).map((w, idx) => ({
    ...w,
    i: `${w.widgetId}-default-${idx}`,
  }));
}

export function listTemplates(): Array<
  Omit<DashboardTemplateMeta, 'widgets'> & { widgetCount: number }
> {
  return DASHBOARD_TEMPLATES.map(({ id, name, description, widgets }) => ({
    id,
    name,
    description,
    widgetCount: widgets.length,
  }));
}
