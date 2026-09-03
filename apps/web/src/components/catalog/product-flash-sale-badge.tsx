import { cn } from '@/lib/utils';

interface ProductFlashSaleBadgeProps {
  formattedTime: string;
  className?: string;
}

const FLASH_GRADIENT = 'linear-gradient(90deg, #ff4500, #ff8c00)';

const MOBILE_DISCOUNT_GRADIENT = 'linear-gradient(135deg, #e11d48, #ef4444, #f97316)';

/**
 * Mobile only — stacked discount pill + countdown below (top-left on product image).
 * Desktop uses ProductFlashSaleBadge unchanged.
 */
export function ProductFlashSaleMobile({ formattedTime }: { formattedTime: string }) {
  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-[2] inline-flex flex-col items-start gap-[3px] sm:hidden"
      style={{ width: 'fit-content', maxWidth: 'max-content' }}
      aria-label={`Flash sale 20% off, ${formattedTime} remaining`}
    >
      <div
        data-radius="pill"
        className="inline-flex flex-none items-center"
        style={{
          width: 'fit-content',
          maxWidth: 'max-content',
          flex: 'none',
          whiteSpace: 'nowrap',
          padding: '5px 8px',
          gap: 4,
          lineHeight: 1,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: '#fff',
          background: MOBILE_DISCOUNT_GRADIENT,
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.28)',
        }}
      >
        <span aria-hidden style={{ color: '#facc15', fontSize: 10, flexShrink: 0 }}>
          ⚡
        </span>
        <span style={{ flexShrink: 0 }}>20% OFF</span>
      </div>

      <div
        data-radius="pill"
        className="inline-flex flex-none items-center"
        style={{
          width: 'fit-content',
          maxWidth: 'max-content',
          flex: 'none',
          whiteSpace: 'nowrap',
          padding: '4px 7px',
          gap: 3,
          lineHeight: 1,
          fontSize: 9,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          color: '#fff',
          background: '#1f2937',
        }}
      >
        <span aria-hidden style={{ flexShrink: 0 }}>
          ⏱
        </span>
        <span style={{ flexShrink: 0 }}>{formattedTime}</span>
      </div>
    </div>
  );
}

/**
 * Desktop — unified pill with timer capsule inside. Do not modify for mobile.
 */
export function ProductFlashSaleBadge({ formattedTime, className }: ProductFlashSaleBadgeProps) {
  return (
    <>
      <div
        data-radius="pill"
        className={cn(
          'product-flash-sale-badge-desktop inline-flex w-fit max-w-max shrink-0 items-center',
          className,
        )}
        style={{
          width: 'fit-content',
          maxWidth: 'max-content',
          flex: 'none',
          height: 30,
          padding: '0 8px 0 7px',
          gap: 5,
          background: FLASH_GRADIENT,
          border: '1px solid rgba(255, 120, 80, 0.48)',
          boxShadow: '0 0 8px rgba(255,80,0,0.5)',
          animation: 'flash-badge-pulse 2s ease-in-out infinite',
        }}
      >
        <span
          aria-hidden
          style={{
            fontSize: 11,
            lineHeight: 1,
            color: '#fde047',
            flexShrink: 0,
          }}
        >
          ⚡
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#fff',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          20% OFF
        </span>
        <span
          data-radius="pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 7px',
            background: 'rgba(0, 0, 0, 0.22)',
            fontSize: 10,
            fontWeight: 900,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            color: '#fff',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formattedTime}
        </span>
      </div>

      <style>{`
        @keyframes flash-badge-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,80,0,0.5); }
          50%       { box-shadow: 0 0 14px rgba(255,80,0,0.85); }
        }
      `}</style>
    </>
  );
}
