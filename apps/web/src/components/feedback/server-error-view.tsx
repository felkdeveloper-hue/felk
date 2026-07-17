import { ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ServerErrorViewProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
}

export function ServerErrorView({
  title = 'Something broke on our end',
  description = "We're already looking into it. Please try again in a moment.",
  onRetry,
  homeHref = '/',
}: ServerErrorViewProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-display text-destructive text-7xl sm:text-8xl">500</p>
      <div className="bg-destructive/10 mt-4 flex size-12 items-center justify-center rounded-full">
        <ServerCrash className="text-destructive size-6" />
      </div>
      <h1 className="font-display text-foreground mt-6 text-3xl sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button size="lg" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button asChild variant="outline" size="lg">
          <a href={homeHref}>Return home</a>
        </Button>
      </div>
    </div>
  );
}
