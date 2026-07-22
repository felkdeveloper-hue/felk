import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/layout/container';
import { cn } from '@/lib/utils';

export function SectionSkeleton({ className }: { className?: string }) {
  return (
    <Container className={cn('py-8 sm:py-10', className)}>
      <Skeleton className="mb-5 h-4 w-24" />
      <Skeleton className="mb-2 h-10 w-64 max-w-full" />
      <Skeleton className="mb-6 h-5 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
        ))}
      </div>
    </Container>
  );
}

export function HeroSkeleton() {
  return (
    <div className="bg-muted relative min-h-[85vh]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <Container className="relative flex min-h-[85vh] flex-col justify-end pb-16 pt-32">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-4 h-16 w-full max-w-2xl" />
        <Skeleton className="mb-8 h-6 w-full max-w-xl" />
        <Skeleton className="h-11 w-40 rounded-full" />
      </Container>
    </div>
  );
}
