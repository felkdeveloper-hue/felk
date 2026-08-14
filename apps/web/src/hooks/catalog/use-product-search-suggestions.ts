import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { QUERY_KEYS } from '@/constants';
import { productsApi } from '@/services/sdk';

const MIN_QUERY_LENGTH = 2;
const SUGGESTION_LIMIT = 6;

export function useProductSearchSuggestions(query: string, enabled = true) {
  const debouncedQuery = useDebounce(query.trim(), 280);
  const active = enabled && debouncedQuery.length >= MIN_QUERY_LENGTH;

  const result = useQuery({
    queryKey: QUERY_KEYS.products.list({ q: debouncedQuery, limit: SUGGESTION_LIMIT, page: 1 }),
    queryFn: () => productsApi.list({ q: debouncedQuery, limit: SUGGESTION_LIMIT, page: 1 }),
    enabled: active,
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  return {
    debouncedQuery,
    products: active ? (result.data?.data ?? []) : [],
    isLoading: active && result.isFetching,
    isActive: active,
  };
}
