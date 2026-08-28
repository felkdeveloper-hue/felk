import { cn } from '@/lib/utils';
import { StarRating } from '@/components/ui/star-rating';

export interface ProductRatingBadgeProps {
  averageRating?: number;
  reviewCount?: number;
  className?: string;
}

export function ProductRatingBadge({
  averageRating,
  reviewCount,
  className,
}: ProductRatingBadgeProps) {
  if (!averageRating || averageRating <= 0) return null;

  const display = Math.round(averageRating * 10) / 10;

  return (
    <div
      className={cn(
        'border-border inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-semibold',
        className,
      )}
      aria-label={`Rated ${display} out of 5 from ${reviewCount ?? 0} reviews`}
    >
      <StarRating value={display} size="md" />
      <span>{display.toFixed(1)}</span>
      {reviewCount != null && reviewCount > 0 ? (
        <>
          <span className="text-muted-foreground font-normal">|</span>
          <span className="text-muted-foreground font-normal">{reviewCount}</span>
        </>
      ) : null}
    </div>
  );
}
