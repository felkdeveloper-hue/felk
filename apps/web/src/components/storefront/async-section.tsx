import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

export type AsyncFailMode = 'error' | 'soft' | 'hide';

export interface AsyncSectionProps<T> {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  data?: T;
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
  skeleton: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  offlineTitle?: string;
  /**
   * How to treat load failures:
   * - error: show full error UI (default)
   * - soft: quiet auto-retry, then subtle inline retry (home rails)
   * - hide: remove the section entirely after retries
   */
  failMode?: AsyncFailMode;
  children: (data: T) => ReactNode;
}

export function AsyncSection<T>({
  isLoading,
  isError,
  error,
  data,
  isEmpty,
  onRetry,
  skeleton,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Check back soon for new content.',
  offlineTitle = 'You appear to be offline',
  failMode = 'error',
  children,
}: AsyncSectionProps<T>) {
  const online = useOnlineStatus();
  const autoRetried = useRef(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!isError || !onRetry || failMode === 'error') return;
    if (autoRetried.current) {
      setGaveUp(true);
      return;
    }
    autoRetried.current = true;
    const timer = window.setTimeout(() => {
      onRetry();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [failMode, isError, onRetry]);

  useEffect(() => {
    if (!isError) {
      autoRetried.current = false;
      setGaveUp(false);
    }
  }, [isError]);

  if (!online) {
    return (
      <EmptyState
        icon={WifiOff}
        title={offlineTitle}
        description="Reconnect to load the latest content from our store."
        action={
          onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Retry
            </button>
          ) : null
        }
      />
    );
  }

  if (isLoading) return <>{skeleton}</>;

  if (isError) {
    if (failMode === 'hide') {
      if (!gaveUp) return <>{skeleton}</>;
      return null;
    }

    if (failMode === 'soft') {
      if (!gaveUp) return <>{skeleton}</>;
      return (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm">
          <p>This section is taking a moment.</p>
          {onRetry ? (
            <button
              type="button"
              onClick={() => {
                setGaveUp(false);
                autoRetried.current = false;
                onRetry();
              }}
              className="border-border text-foreground hover:bg-muted rounded-none border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
            >
              Refresh
            </button>
          ) : null}
        </div>
      );
    }

    return (
      <ErrorState
        title="Unable to load content"
        description={error?.message ?? 'The content service is temporarily unavailable.'}
        onRetry={onRetry}
      />
    );
  }

  if (data === undefined || (isEmpty?.(data) ?? false)) {
    // Intentionally blank empty copy → hide the block (e.g. home CMS sections).
    if (!emptyTitle && !emptyDescription) return null;
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children(data)}</>;
}
