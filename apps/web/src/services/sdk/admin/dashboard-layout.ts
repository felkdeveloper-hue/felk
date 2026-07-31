import { http } from '@/lib/http-client';

export interface DashboardWidgetSettings {
  period?: string;
  chartType?: string;
  metric?: string;
  refreshInterval?: number;
  displayMode?: string;
  [key: string]: unknown;
}

export interface DashboardWidgetPlacement {
  i: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  hidden?: boolean;
  collapsed?: boolean;
  pinned?: boolean;
  settings?: DashboardWidgetSettings;
}

export interface DashboardLayoutSnapshot {
  widgets: DashboardWidgetPlacement[];
  theme?: Record<string, unknown>;
  updatedAt?: string;
}

export interface DashboardLayoutData {
  id: string;
  userId: string;
  activeKey: string;
  widgets: DashboardWidgetPlacement[];
  theme: Record<string, unknown>;
  layoutKeys: string[];
  layouts: Record<string, DashboardLayoutSnapshot>;
  roleDefaultApplied?: string | null;
  updatedAt: string;
}

export interface DashboardWidgetMeta {
  id: string;
  name: string;
  description?: string;
  category: string;
  defaultSize: { w: number; h: number; minW?: number; minH?: number };
  permissions: string[];
  settingsSchema?: Record<string, unknown>;
}

export interface DashboardTemplateMeta {
  id: string;
  name: string;
  description: string;
  widgetCount: number;
}

export interface DashboardCatalog {
  widgets: DashboardWidgetMeta[];
  templates: DashboardTemplateMeta[];
  allWidgets: DashboardWidgetMeta[];
}

export const adminDashboardApi = {
  getCatalog(): Promise<DashboardCatalog> {
    return http.get<DashboardCatalog>('/analytics/admin/dashboard/catalog');
  },

  getLayout(): Promise<DashboardLayoutData> {
    return http.get<DashboardLayoutData>('/analytics/admin/dashboard/layout');
  },

  saveLayout(body: {
    layoutKey?: string;
    activeKey?: string;
    widgets: DashboardWidgetPlacement[];
    theme?: Record<string, unknown>;
  }): Promise<DashboardLayoutData> {
    return http.put<DashboardLayoutData>('/analytics/admin/dashboard/layout', body);
  },

  resetLayout(): Promise<DashboardLayoutData> {
    return http.post<DashboardLayoutData>('/analytics/admin/dashboard/layout/reset');
  },

  applyTemplate(templateId: string, overwritePersonal = false): Promise<DashboardLayoutData> {
    return http.post<DashboardLayoutData>('/analytics/admin/dashboard/layout/template', {
      templateId,
      overwritePersonal,
    });
  },

  duplicateLayout(fromKey: string, toKey: string, setActive = false): Promise<DashboardLayoutData> {
    return http.post<DashboardLayoutData>('/analytics/admin/dashboard/layout/duplicate', {
      fromKey,
      toKey,
      setActive,
    });
  },

  importLayout(
    snapshot: DashboardLayoutSnapshot,
    layoutKey = 'personal',
    setActive = true,
  ): Promise<DashboardLayoutData> {
    return http.post<DashboardLayoutData>('/analytics/admin/dashboard/layout/import', {
      layoutKey,
      snapshot,
      setActive,
    });
  },

  exportLayout(key?: string): Promise<{
    version: number;
    exportedAt: string;
    layoutKey: string;
    snapshot: DashboardLayoutSnapshot;
  }> {
    const q = key ? `?key=${encodeURIComponent(key)}` : '';
    return http.get(`/analytics/admin/dashboard/layout/export${q}`);
  },
};
