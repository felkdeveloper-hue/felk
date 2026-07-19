export const QUERY_KEYS = {
  auth: { me: () => ['auth', 'me'] as const },
  dashboard: { stats: () => ['dashboard', 'stats'] as const },
  products: {
    list: (params?: unknown) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  orders: {
    list: (params?: unknown) => ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    timeline: (id: string) => ['orders', id, 'timeline'] as const,
  },
  reviews: {
    list: (params?: unknown) => ['reviews', 'list', params] as const,
  },
  customers: {
    list: (params?: unknown) => ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  inventory: {
    items: (params?: unknown) => ['inventory', 'items', params] as const,
    warehouses: () => ['inventory', 'warehouses'] as const,
    alerts: () => ['inventory', 'alerts'] as const,
  },
  payments: {
    list: (params?: unknown) => ['payments', 'list', params] as const,
  },
  cms: {
    resource: (resource: string, params?: unknown) => ['cms', resource, params] as const,
  },
} as const;
