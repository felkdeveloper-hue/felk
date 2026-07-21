import type { ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

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
  children,
}: AsyncSectionProps<T>) {
  const online = useOnlineStatus();

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
