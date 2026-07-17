import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { MAX_RECENT_SEARCHES, POPULAR_SEARCHES, RECENT_SEARCHES_KEY } from '@/constants/catalog';

function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useSearchExperience(query: string) {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches());
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  const suggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const needle = debouncedQuery.toLowerCase();
    return [...POPULAR_SEARCHES, ...recentSearches]
      .filter((term, index, array) => array.indexOf(term) === index)
      .filter((term) => term.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [debouncedQuery, recentSearches]);

  const rememberSearch = useCallback((term: string) => {
    const normalized = term.trim();
    if (!normalized) return;
    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((item) => item !== normalized)].slice(
        0,
        MAX_RECENT_SEARCHES,
      );
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  }, []);

  return {
    debouncedQuery,
    recentSearches,
    popularSearches: POPULAR_SEARCHES,
    suggestions,
    rememberSearch,
    clearRecentSearches,
  };
}
