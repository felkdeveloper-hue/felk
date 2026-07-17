import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks';
import { cn } from '@/lib/utils';

export interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-slot="offline-banner"
      role="status"
      className={cn(
        'bg-warning text-warning-foreground flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
        'animate-in slide-in-from-top-2',
        className,
      )}
    >
      <WifiOff className="size-4" />
      You are currently offline. Some features may be unavailable.
    </div>
  );
}
