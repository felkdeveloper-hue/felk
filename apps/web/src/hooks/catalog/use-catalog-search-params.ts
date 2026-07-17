import { useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  catalogSearchToUrlParams,
  countActiveFilters,
  parseCatalogSearch,
  type CatalogSearchState,
} from '@/utils/catalog';

export function useCatalogSearchParams() {
  const navigate = useNavigate();
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;
  const state = useMemo(() => parseCatalogSearch(rawSearch), [rawSearch]);

  const setSearch = useCallback(
    (patch: Partial<CatalogSearchState>, options?: { replace?: boolean }) => {
      const next = { ...state, ...patch };
      if (!patch.page) next.page = 1;
      void navigate({
        search: catalogSearchToUrlParams(next) as never,
        replace: options?.replace,
      });
    },
    [navigate, state],
  );

  const clearFilters = useCallback(() => {
    void navigate({
      search: catalogSearchToUrlParams({
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        view: state.view,
        limit: state.limit,
        page: 1,
      }) as never,
      replace: true,
    });
  }, [navigate, state.limit, state.sortBy, state.sortOrder, state.view]);

  return {
    state,
    setSearch,
    clearFilters,
    activeFilterCount: countActiveFilters(state),
  };
}
