import { cn } from '@/lib/utils';

export interface DeliveryTrustCueProps {
  className?: string;

  /** PDP-only bold yellow guarantee line. */

  variant?: 'pdp';
}

/** Delivery guarantee — PDP only. */

export function DeliveryTrustCue({ className, variant = 'pdp' }: DeliveryTrustCueProps) {
  if (variant !== 'pdp') return null;

  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-[12px] font-bold tracking-wide sm:text-[13px]',

        className,
      )}

      style={{ color: '#EAB308' }}
    >
      <span
        className="relative inline-flex size-4 shrink-0 items-center justify-center"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"

          className="fe-truck-motion size-4"

          fill="none"

          stroke="currentColor"

          strokeWidth="2"

          strokeLinecap="round"

          strokeLinejoin="round"
        >
          <path d="M3 7h11v10H3z" />

          <path d="M14 10h4l3 3v4h-7" />

          <circle cx="7" cy="18" r="1.5" />

          <circle cx="17" cy="18" r="1.5" />
        </svg>
      </span>

      <span>Guarantee delivered within or before 4 days</span>
    </p>
  );
}
