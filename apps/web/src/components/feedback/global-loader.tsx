import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export interface GlobalLoaderProps {
  visible?: boolean;
  label?: string;
}

export function GlobalLoader({ visible = true, label = 'Loading' }: GlobalLoaderProps) {
  if (!visible) return null;

  return (
    <div
      data-slot="global-loader"
      role="alert"
      aria-busy="true"
      className={cn(
        'bg-background/80 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm',
        'animate-in fade-in-0',
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
