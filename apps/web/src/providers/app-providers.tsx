import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './auth-provider';
import { ErrorBoundary } from './error-boundary';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './toast-provider';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Single composition root for every cross-cutting provider. Order matters:
 * the error boundary sits outermost (right under Helmet) so it can catch
 * failures from any provider or route below it, while auth hydration sits
 * innermost so router-aware guards always see settled auth state.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
