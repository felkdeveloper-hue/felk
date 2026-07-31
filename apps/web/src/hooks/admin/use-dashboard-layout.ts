import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminDashboardApi,
  type DashboardLayoutSnapshot,
  type DashboardWidgetPlacement,
} from '@/services/sdk/admin';
import { AppError } from '@/lib/errors';

export const dashboardLayoutKeys = {
  all: ['admin', 'dashboard-layout'] as const,
  layout: () => [...dashboardLayoutKeys.all, 'layout'] as const,
  catalog: () => [...dashboardLayoutKeys.all, 'catalog'] as const,
};

export function useDashboardLayoutQuery() {
  return useQuery({
    queryKey: dashboardLayoutKeys.layout(),
    queryFn: () => adminDashboardApi.getLayout(),
    staleTime: 30_000,
  });
}

export function useDashboardCatalogQuery() {
  return useQuery({
    queryKey: dashboardLayoutKeys.catalog(),
    queryFn: () => adminDashboardApi.getCatalog(),
    staleTime: 5 * 60_000,
  });
}

export function useSaveDashboardLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      layoutKey?: string;
      activeKey?: string;
      widgets: DashboardWidgetPlacement[];
      theme?: Record<string, unknown>;
    }) => adminDashboardApi.saveLayout(body),
    onSuccess: (data) => {
      qc.setQueryData(dashboardLayoutKeys.layout(), data);
    },
    onError: (err) => {
      toast.error(err instanceof AppError ? err.message : 'Failed to save layout');
    },
  });
}

export function useDashboardLayoutActions() {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: dashboardLayoutKeys.layout() });

  const reset = useMutation({
    mutationFn: () => adminDashboardApi.resetLayout(),
    onSuccess: (data) => {
      qc.setQueryData(dashboardLayoutKeys.layout(), data);
      toast.success('Dashboard reset to role default');
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Reset failed'),
  });

  const applyTemplate = useMutation({
    mutationFn: ({
      templateId,
      overwritePersonal,
    }: {
      templateId: string;
      overwritePersonal?: boolean;
    }) => adminDashboardApi.applyTemplate(templateId, overwritePersonal),
    onSuccess: (data) => {
      qc.setQueryData(dashboardLayoutKeys.layout(), data);
      toast.success('Template applied');
    },
    onError: (err) =>
      toast.error(err instanceof AppError ? err.message : 'Unable to apply template'),
  });

  const duplicate = useMutation({
    mutationFn: ({
      fromKey,
      toKey,
      setActive,
    }: {
      fromKey: string;
      toKey: string;
      setActive?: boolean;
    }) => adminDashboardApi.duplicateLayout(fromKey, toKey, setActive),
    onSuccess: (data) => {
      qc.setQueryData(dashboardLayoutKeys.layout(), data);
      toast.success('Layout duplicated');
    },
  });

  const importLayout = useMutation({
    mutationFn: (payload: {
      snapshot: DashboardLayoutSnapshot;
      layoutKey?: string;
      setActive?: boolean;
    }) => adminDashboardApi.importLayout(payload.snapshot, payload.layoutKey, payload.setActive),
    onSuccess: (data) => {
      qc.setQueryData(dashboardLayoutKeys.layout(), data);
      toast.success('Layout imported');
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Import failed'),
  });

  return { reset, applyTemplate, duplicate, importLayout, invalidate };
}
