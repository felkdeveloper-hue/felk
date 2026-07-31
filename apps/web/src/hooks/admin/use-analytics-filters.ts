import { useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  ANALYTICS_FILTER_KEYS,
  type AnalyticsFilter,
  type AnalyticsPeriod,
} from '@/services/sdk/admin';

const PERIODS: AnalyticsPeriod[] = ['today', 'yesterday', '7d', '30d', '90d', 'custom'];
const DEVICES = ['desktop', 'mobile', 'tablet', 'unknown'] as const;

function parseFilter(
  raw: Record<string, unknown>,
  defaults: Partial<AnalyticsFilter>,
): AnalyticsFilter {
  const filter: AnalyticsFilter = { ...defaults };

  for (const key of ANALYTICS_FILTER_KEYS) {
    const value = raw[key];
    if (value === undefined || value === null || value === '') continue;
    const str = String(value);

    if (key === 'page' || key === 'limit') {
      const n = Number(str);
      if (Number.isFinite(n) && n > 0) filter[key] = n;
      continue;
    }

    if (key === 'period') {
      if (PERIODS.includes(str as AnalyticsPeriod)) {
        filter.period = str as AnalyticsPeriod;
      }
      continue;
    }

    if (key === 'device') {
      if ((DEVICES as readonly string[]).includes(str)) {
        filter.device = str as AnalyticsFilter['device'];
      }
      continue;
    }

    filter[key] = str;
  }

  if (!filter.period && !filter.from && !filter.to && defaults.period) {
    filter.period = defaults.period;
  }

  return filter;
}

function filterToSearch(
  filter: AnalyticsFilter,
  defaults: Partial<AnalyticsFilter>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};

  for (const key of ANALYTICS_FILTER_KEYS) {
    const value = filter[key];
    if (value === undefined || value === null || value === '') continue;
    if (
      key === 'period' &&
      defaults.period &&
      value === defaults.period &&
      !filter.from &&
      !filter.to
    ) {
      continue;
    }
    if (key === 'page' && value === 1) continue;
    out[key] = value as string | number;
  }

  return out;
}

export interface UseAnalyticsFiltersOptions {
  defaults?: Partial<AnalyticsFilter>;
}

export function useAnalyticsFilters(options: UseAnalyticsFiltersOptions = {}) {
  const defaultPeriod = options.defaults?.period;
  const defaultPage = options.defaults?.page;
  const defaultLimit = options.defaults?.limit;

  const defaults = useMemo<Partial<AnalyticsFilter>>(
    () => ({
      ...(defaultPeriod ? { period: defaultPeriod } : {}),
      ...(defaultPage ? { page: defaultPage } : {}),
      ...(defaultLimit ? { limit: defaultLimit } : {}),
    }),
    [defaultPeriod, defaultPage, defaultLimit],
  );

  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;

  const filter = useMemo(() => parseFilter(rawSearch, defaults), [rawSearch, defaults]);

  const setFilter = useCallback(
    (patch: Partial<AnalyticsFilter>) => {
      const current = parseFilter(rawSearch, defaults);
      const next: AnalyticsFilter = { ...current, ...patch };

      if (patch.period && patch.period !== 'custom') {
        delete next.from;
        delete next.to;
      }

      const pageOnly =
        Object.keys(patch).length === 1 && (patch.page !== undefined || patch.limit !== undefined);
      if (!pageOnly && patch.page === undefined) {
        next.page = 1;
      }

      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === '') {
          delete next[k as keyof AnalyticsFilter];
        }
      }

      const nextSearch: Record<string, string | number> = {
        ...filterToSearch(next, defaults),
      };
      // Preserve drill-down trail across filter tweaks
      if (typeof rawSearch._trail === 'string' && rawSearch._trail) {
        nextSearch._trail = rawSearch._trail;
      }

      void navigate({
        search: nextSearch as never,
        replace: false,
      });
    },
    [defaults, navigate, rawSearch],
  );

  const clearFilters = useCallback(() => {
    const nextSearch: Record<string, string | number> = {
      ...filterToSearch({ ...defaults, page: 1 }, defaults),
    };
    if (typeof rawSearch._trail === 'string' && rawSearch._trail) {
      nextSearch._trail = rawSearch._trail;
    }
    void navigate({
      search: nextSearch as never,
      replace: false,
    });
  }, [defaults, navigate, rawSearch]);

  const hasActiveFilters = useMemo(() => {
    return ANALYTICS_FILTER_KEYS.some((key) => {
      if (key === 'page' || key === 'limit') return false;
      if (key === 'period') {
        return Boolean(filter.period && defaults.period && filter.period !== defaults.period);
      }
      const v = filter[key];
      return v !== undefined && v !== null && v !== '';
    });
  }, [defaults.period, filter]);

  return { filter, setFilter, clearFilters, hasActiveFilters };
}
