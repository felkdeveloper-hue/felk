import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAR_FILLED = 'fill-amber-400 text-amber-400';
const STAR_EMPTY = 'text-neutral-200';

const SIZE_CLASS = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

export type StarRatingSize = keyof typeof SIZE_CLASS;

function starFillAmount(rating: number, starIndex: number): number {
  return Math.min(1, Math.max(0, rating - (starIndex - 1)));
}

function PartialStar({ fill, className }: { fill: number; className?: string }) {
  const clamped = Math.min(1, Math.max(0, fill));
  const fillWidth = `${clamped * 100}%`;

  return (
    <span className={cn('relative inline-flex shrink-0', className)} aria-hidden>
      <Star className={cn('size-[inherit]', STAR_EMPTY)} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: fillWidth }}>
        <Star className={cn('size-[inherit]', STAR_FILLED)} />
      </span>
    </span>
  );
}

export interface StarRatingProps {
  /** Rating value from 0–5; decimals render partial stars (e.g. 4.6). */
  value: number;
  size?: StarRatingSize;
  className?: string;
  /** Whole-star selection for review forms. */
  interactive?: boolean;
  onChange?: (value: number) => void;
}

/** Reusable star row with accurate fractional fill for decimal ratings. */
export function StarRating({
  value,
  size = 'sm',
  className,
  interactive = false,
  onChange,
}: StarRatingProps) {
  const iconClass = SIZE_CLASS[size];
  const displayValue = Math.min(5, Math.max(0, value));

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? undefined : `Rated ${displayValue.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = starFillAmount(displayValue, star);

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onClick={() => onChange?.(star)}
              className="inline-flex shrink-0 transition-opacity hover:opacity-80"
            >
              <PartialStar fill={star <= value ? 1 : 0} className={iconClass} />
            </button>
          );
        }

        return <PartialStar key={star} fill={fill} className={iconClass} />;
      })}
    </div>
  );
}
