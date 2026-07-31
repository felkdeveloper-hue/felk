import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import { Pin, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { AdminErrorState, AdminPageHeader, PageMotion } from '@/components/admin';
import { ChartSkeleton } from '@/components/admin/analytics';
import { DashboardCustomizeBar } from './DashboardCustomizeBar';
import { DashboardWidgetRenderer } from './widgets';
import {
  useDashboardCatalogQuery,
  useDashboardLayoutActions,
  useDashboardLayoutQuery,
  useSaveDashboardLayout,
} from '@/hooks/admin';
import { adminDashboardApi } from '@/services/sdk/admin';
import type {
  DashboardLayoutSnapshot,
  DashboardWidgetMeta,
  DashboardWidgetPlacement,
} from '@/services/sdk/admin';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGrid = WidthProvider(Responsive);

const ROW_HEIGHT = 56;
const BREAKPOINTS = { lg: 1200, md: 768, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 4 };

function toLgLayout(widgets: DashboardWidgetPlacement[]): Layout[] {
  return widgets
    .filter((w) => !w.hidden)
    .map((w) => ({
      i: w.i,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.collapsed ? 1 : w.h,
      minW: w.minW ?? 2,
      minH: w.collapsed ? 1 : (w.minH ?? 2),
      maxW: w.maxW,
      maxH: w.collapsed ? 1 : w.maxH,
      static: !!w.pinned,
    }));
}

/** Derive tablet (two-column) and mobile (stacked) from the desktop layout. */
function buildResponsiveLayouts(widgets: DashboardWidgetPlacement[]): Layouts {
  const lg = toLgLayout(widgets);
  const md = lg.map((item, idx) => ({
    ...item,
    w: 4,
    x: idx % 2 === 0 ? 0 : 4,
    y: Math.floor(idx / 2) * item.h,
  }));
  const sm = lg.map((item, idx) => ({
    ...item,
    w: 4,
    x: 0,
    y: idx * (item.h || 2),
    static: true,
  }));
  return { lg, md, sm };
}

export function PersonalizedDashboard() {
  const layoutQuery = useDashboardLayoutQuery();
  const catalogQuery = useDashboardCatalogQuery();
  const saveMutation = useSaveDashboardLayout();
  const actions = useDashboardLayoutActions();

  const [customizing, setCustomizing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetPlacement[]>([]);
  const [theme, setTheme] = useState<Record<string, unknown>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!layoutQuery.data) return;
    setWidgets(layoutQuery.data.widgets ?? []);
    setTheme(layoutQuery.data.theme ?? {});
    hydrated.current = true;
  }, [layoutQuery.data]);

  const scheduleSave = useCallback(
    (next: DashboardWidgetPlacement[], nextTheme?: Record<string, unknown>) => {
      if (!hydrated.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate({
          layoutKey: layoutQuery.data?.activeKey ?? 'personal',
          widgets: next,
          theme: nextTheme ?? theme,
        });
      }, 500);
    },
    [layoutQuery.data?.activeKey, saveMutation, theme],
  );

  const visibleWidgets = useMemo(() => widgets.filter((w) => !w.hidden), [widgets]);
  const hiddenCount = widgets.filter((w) => w.hidden).length;
  const layouts = useMemo(() => buildResponsiveLayouts(widgets), [widgets]);

  const onLayoutChange = useCallback(
    (current: Layout[], allLayouts: Layouts) => {
      if (!customizing) return;
      // Persist desktop (lg) positions only
      const layout = allLayouts.lg ?? current;
      setWidgets((prev) => {
        const byId = new Map(layout.map((l) => [l.i, l]));
        const next = prev.map((w) => {
          const l = byId.get(w.i);
          if (!l || w.hidden) return w;
          return {
            ...w,
            x: l.x,
            y: l.y,
            w: l.w,
            h: w.collapsed ? w.h : l.h,
          };
        });
        scheduleSave(next);
        return next;
      });
    },
    [customizing, scheduleSave],
  );

  const patchWidget = useCallback(
    (id: string, patch: Partial<DashboardWidgetPlacement>) => {
      setWidgets((prev) => {
        const next = prev.map((w) => (w.i === id ? { ...w, ...patch } : w));
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const addWidget = useCallback(
    (meta: DashboardWidgetMeta) => {
      const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
      const instance: DashboardWidgetPlacement = {
        i: `${meta.id}-${Date.now().toString(36)}`,
        widgetId: meta.id,
        x: 0,
        y: maxY,
        w: meta.defaultSize.w,
        h: meta.defaultSize.h,
        minW: meta.defaultSize.minW,
        minH: meta.defaultSize.minH,
        hidden: false,
        collapsed: false,
        pinned: false,
        settings: { period: '7d' },
      };
      const next = [...widgets, instance];
      setWidgets(next);
      scheduleSave(next);
      toast.success(`Added ${meta.name}`);
    },
    [scheduleSave, widgets],
  );

  const restoreHidden = useCallback(() => {
    const next = widgets.map((w) => ({ ...w, hidden: false }));
    setWidgets(next);
    scheduleSave(next);
  }, [scheduleSave, widgets]);

  const exportLayout = useCallback(async () => {
    try {
      const payload = await adminDashboardApi.exportLayout(layoutQuery.data?.activeKey);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-layout-${payload.layoutKey}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Layout exported');
    } catch {
      toast.error('Export failed');
    }
  }, [layoutQuery.data?.activeKey]);

  const importFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as {
          snapshot?: DashboardLayoutSnapshot;
          widgets?: DashboardWidgetPlacement[];
          theme?: Record<string, unknown>;
        };
        const snapshot: DashboardLayoutSnapshot = json.snapshot ?? {
          widgets: json.widgets ?? [],
          theme: json.theme ?? {},
        };
        actions.importLayout.mutate({ snapshot, layoutKey: 'imported', setActive: true });
      } catch {
        toast.error('Invalid layout file');
      }
    },
    [actions.importLayout],
  );

  if (layoutQuery.isError) {
    return (
      <AdminErrorState
        message="Unable to load personalized dashboard."
        onRetry={() => layoutQuery.refetch()}
      />
    );
  }

  return (
    <PageMotion>
      <AdminPageHeader
        title="Dashboard"
        description="Store performance at a glance — revenue, traffic, funnel, and catalog health."
        actions={
          <DashboardCustomizeBar
            customizing={customizing}
            onToggleCustomize={() => setCustomizing((v) => !v)}
            catalog={catalogQuery.data}
            layout={layoutQuery.data}
            hiddenCount={hiddenCount}
            onAddWidget={addWidget}
            onRestoreHidden={restoreHidden}
            onApplyTemplate={(id) =>
              actions.applyTemplate.mutate({ templateId: id, overwritePersonal: false })
            }
            onReset={() => {
              if (window.confirm('Reset dashboard to your role default?')) {
                actions.reset.mutate();
              }
            }}
            onDuplicate={() => {
              const from = layoutQuery.data?.activeKey ?? 'personal';
              const to = `copy-${Date.now().toString(36)}`;
              actions.duplicate.mutate({ fromKey: from, toKey: to, setActive: true });
            }}
            onExport={() => void exportLayout()}
            onImportFile={(f) => void importFile(f)}
          />
        }
      />

      <div className="mb-4 rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/10 via-blue-500/5 to-transparent px-4 py-3">
        <p className="text-sm text-[var(--admin-ink)]">
          Charts refresh automatically every few seconds — no need to reload the page.
        </p>
      </div>

      {customizing ? (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
          Customize mode — drag to rearrange, resize from corners, pin / hide / collapse from each
          widget. Changes save automatically.
          {saveMutation.isPending ? ' Saving…' : ''}
        </div>
      ) : null}

      {layoutQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChartSkeleton key={i} height={160} />
          ))}
        </div>
      ) : !visibleWidgets.length ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
          No widgets visible. Open Customize to add widgets or restore hidden ones.
        </div>
      ) : (
        <ResponsiveGrid
          className="dashboard-grid"
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          layouts={layouts}
          onLayoutChange={onLayoutChange}
          isDraggable={customizing}
          isResizable={customizing}
          draggableHandle=".dashboard-drag-handle"
          compactType="vertical"
          useCSSTransforms
        >
          {visibleWidgets.map((placement) => (
            <div key={placement.i} className="group relative">
              {customizing ? (
                <div className="bg-background/90 absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm">
                  <button
                    type="button"
                    className="dashboard-drag-handle text-muted-foreground hover:text-foreground cursor-grab px-1.5 py-0.5 text-[10px] active:cursor-grabbing"
                    aria-label="Drag widget"
                  >
                    Drag
                  </button>
                  <button
                    type="button"
                    title={placement.pinned ? 'Unpin' : 'Pin'}
                    className={`rounded p-1 ${placement.pinned ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => patchWidget(placement.i, { pinned: !placement.pinned })}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={placement.collapsed ? 'Expand' : 'Collapse'}
                    className="text-muted-foreground rounded p-1"
                    onClick={() => patchWidget(placement.i, { collapsed: !placement.collapsed })}
                  >
                    {placement.collapsed ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronUp className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Hide"
                    className="text-muted-foreground rounded p-1"
                    onClick={() => patchWidget(placement.i, { hidden: true })}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              <div className="h-full">
                <DashboardWidgetRenderer placement={placement} />
              </div>
            </div>
          ))}
        </ResponsiveGrid>
      )}

      <style>{`
        .dashboard-grid .react-grid-item.react-grid-placeholder {
          background: rgb(13 148 136 / 0.15);
          border-radius: 0.75rem;
          opacity: 1;
        }
        .dashboard-grid .react-grid-item.react-draggable-dragging {
          z-index: 20;
          transition: box-shadow 120ms ease;
          box-shadow: 0 12px 32px hsl(var(--foreground) / 0.12);
        }
        .dashboard-grid .react-resizable-handle::after {
          border-color: hsl(var(--muted-foreground) / 0.5);
        }
        @media (max-width: 768px) {
          .dashboard-grid .react-grid-item {
            /* stacked feel: grid still manages, but denser touch targets */
          }
        }
      `}</style>
    </PageMotion>
  );
}
