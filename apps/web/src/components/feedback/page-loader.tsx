import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export interface PageLoaderProps {
  label?: string;
  className?: string;
  minHeight?: string;
}

export function PageLoader({ label = 'Loading', className, minHeight = '50vh' }: PageLoaderProps) {
  return (
    <div
      data-slot="page-loader"
      role="status"
      className={cn('flex w-full flex-col items-center justify-center gap-3 py-16', className)}
      style={{ minHeight }}
    >
      <Spinner size="default" />
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
