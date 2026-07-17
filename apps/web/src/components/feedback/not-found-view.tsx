import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface NotFoundViewProps {
  title?: string;
  description?: string;
  homeHref?: string;
}

export function NotFoundView({
  title = 'This page has wandered off',
  description = "We couldn't find the page you were looking for. It may have been moved or no longer exists.",
  homeHref = '/',
}: NotFoundViewProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-display text-primary text-7xl sm:text-8xl">404</p>
      <div className="bg-accent mt-4 flex size-12 items-center justify-center rounded-full">
        <Compass className="text-accent-foreground size-6" />
      </div>
      <h1 className="font-display text-foreground mt-6 text-3xl sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{description}</p>
      <Button asChild size="lg" className="mt-8">
        <a href={homeHref}>Return home</a>
      </Button>
    </div>
  );
}
