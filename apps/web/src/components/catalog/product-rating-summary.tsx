import { cn } from '@/lib/utils';
import { StarRating } from '@/components/ui/star-rating';

export interface ProductRatingSummaryProps {
  average: number;
  count: number;
  className?: string;
  /** Scroll to reviews section when clicked. */
  href?: string;
}

/** PDP-style filled stars + "(N reviews)". */
export function ProductRatingSummary({
  average,
  count,
  className,
  href = '#product-reviews',
}: ProductRatingSummaryProps) {
  if (!average || average <= 0 || !count) return null;

  const content = (
    <>
      <StarRating value={average} size="sm" />
      <span className="text-muted-foreground text-sm tabular-nums">
        ({count.toLocaleString()} review{count === 1 ? '' : 's'})
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          'inline-flex items-center gap-2 transition-opacity hover:opacity-80',
          className,
        )}
        aria-label={`Rated ${average.toFixed(1)} out of 5 from ${count} reviews`}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      aria-label={`Rated ${average.toFixed(1)} out of 5 from ${count} reviews`}
    >
      {content}
    </div>
  );
}
