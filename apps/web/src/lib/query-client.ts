import { QueryClient } from '@tanstack/react-query';
import { AppError } from '@/lib/errors';

function shouldRetry(failureCount: number, error: unknown): boolean {
  const appError = AppError.isAppError(error) ? error : undefined;
  if (appError && (appError.isUnauthorized || appError.isForbidden || appError.isNotFound)) {
    return false;
  }
  if (appError?.isValidationError) return false;
  // Transient outages / overload — give storefront rails a few chances.
  return failureCount < 3;
}

function retryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 8_000);
}

/** Shared QueryClient instance used by the router (prefetch) and React tree. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
