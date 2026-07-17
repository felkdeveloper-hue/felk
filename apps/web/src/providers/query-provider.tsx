import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useState } from 'react';
import { env } from '@/config';
import { AppError } from '@/lib/errors';

interface QueryProviderProps {
  children: ReactNode;
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  const appError = AppError.isAppError(error) ? error : undefined;
  if (appError && (appError.isUnauthorized || appError.isForbidden || appError.isNotFound)) {
    return false;
  }
  return failureCount < 1;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: shouldRetry,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {env.isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
