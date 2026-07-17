import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OfflineViewProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function OfflineView({
  title = "You're offline",
  description = 'Check your internet connection and try again.',
  onRetry,
}: OfflineViewProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <WifiOff className="text-muted-foreground size-6" />
      </div>
      <h1 className="font-display text-foreground mt-6 text-3xl sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{description}</p>
      {onRetry ? (
        <Button size="lg" className="mt-8" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
