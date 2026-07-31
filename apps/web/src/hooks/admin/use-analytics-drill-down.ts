import { useCallback, useMemo } from 'react';
import { useNavigate, useRouterState, useSearch } from '@tanstack/react-router';
import type { AnalyticsFilter } from '@/services/sdk/admin';
import { ADMIN_ROUTES } from '@/constants';
import {
  decodeTrail,
  encodeTrail,
  mergeDrillSearch,
  resolveDrillPath,
  type DrillSpec,
  type DrillTrailStep,
} from '@/lib/analytics/drill-down';

export function useAnalyticsDrillDown(currentFilter: AnalyticsFilter = {}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;

  const trail = useMemo(() => decodeTrail(rawSearch._trail), [rawSearch._trail]);

  const drill = useCallback(
    (spec: DrillSpec) => {
      const to = resolveDrillPath(spec.destination, spec.entityId);
      const nextTrail: DrillTrailStep[] = [
        ...trail,
        {
          label: spec.label,
          to,
          search: mergeDrillSearch({
            currentFilter,
            append: spec.append,
            extraSearch: spec.extraSearch,
            trail: [],
          }),
        },
      ];

      // Persist previous step search snapshot for crumb restore
      if (nextTrail.length >= 1) {
        const last = nextTrail[nextTrail.length - 1]!;
        last.search = mergeDrillSearch({
          currentFilter,
          append: spec.append,
          extraSearch: spec.extraSearch,
          trail: nextTrail.slice(0, -1),
        });
      }

      void navigate({
        to: to as never,
        search: mergeDrillSearch({
          currentFilter,
          append: spec.append,
          extraSearch: spec.extraSearch,
          trail: nextTrail,
        }) as never,
      });
    },
    [currentFilter, navigate, trail],
  );

  const goToTrailStep = useCallback(
    (index: number) => {
      if (index < 0) {
        void navigate({
          to: ADMIN_ROUTES.analytics as never,
          search: {} as never,
        });
        return;
      }
      const step = trail[index];
      if (!step) return;
      const parentTrail = trail.slice(0, index);
      void navigate({
        to: step.to as never,
        search: {
          ...step.search,
          ...(parentTrail.length ? { _trail: encodeTrail(parentTrail) } : {}),
        } as never,
      });
    },
    [navigate, trail],
  );

  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      {
        label: 'Analytics',
        onClick: () =>
          void navigate({
            to: ADMIN_ROUTES.analytics as never,
            search: analyticsSearchKeepPeriod(currentFilter) as never,
          }),
      },
    ];

    trail.forEach((step, i) => {
      crumbs.push({
        label: step.label,
        onClick: i < trail.length - 1 ? () => goToTrailStep(i) : undefined,
      });
    });

    // If no trail but not on overview, show current page as soft crumb
    if (!trail.length && pathname !== ADMIN_ROUTES.analytics) {
      const pageLabel = pageLabelFromPath(pathname);
      if (pageLabel) crumbs.push({ label: pageLabel });
    }

    return crumbs;
  }, [currentFilter, goToTrailStep, navigate, pathname, trail]);

  return { drill, trail, breadcrumbs, goToTrailStep };
}

function analyticsSearchKeepPeriod(filter: AnalyticsFilter): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (filter.period) out.period = filter.period;
  if (filter.from) out.from = filter.from;
  if (filter.to) out.to = filter.to;
  return out;
}

function pageLabelFromPath(pathname: string): string | null {
  const map: Record<string, string> = {
    [ADMIN_ROUTES.analyticsVisitors]: 'Visitors',
    [ADMIN_ROUTES.analyticsSessions]: 'Sessions',
    [ADMIN_ROUTES.analyticsEvents]: 'Events',
    [ADMIN_ROUTES.analyticsPages]: 'Pages',
    [ADMIN_ROUTES.analyticsLive]: 'Live',
    [ADMIN_ROUTES.analyticsDevices]: 'Devices',
    [ADMIN_ROUTES.analyticsGeo]: 'Geography',
    [ADMIN_ROUTES.analyticsTraffic]: 'Traffic',
    [ADMIN_ROUTES.analyticsProducts]: 'Products',
    [ADMIN_ROUTES.analyticsCart]: 'Cart',
    [ADMIN_ROUTES.analyticsWishlist]: 'Wishlist',
    [ADMIN_ROUTES.analyticsRecovery]: 'Recovery',
    [ADMIN_ROUTES.analyticsReturning]: 'Returning',
    [ADMIN_ROUTES.analyticsSearch]: 'Search',
    [ADMIN_ROUTES.analyticsFunnel]: 'Funnel',
    [ADMIN_ROUTES.analyticsActivity]: 'Activity',
    [ADMIN_ROUTES.analyticsCheckout]: 'Checkout',
    [ADMIN_ROUTES.analyticsRevenue]: 'Revenue',
    [ADMIN_ROUTES.orders]: 'Orders',
  };
  return map[pathname] ?? null;
}
