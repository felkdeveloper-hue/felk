import { useFlashSale } from '@/contexts/flash-sale-context';
import { cn } from '@/lib/utils';

interface FlashSaleCountdownProps {
  className?: string;
  /** Tighter pill for crowded mobile headers. */
  compact?: boolean;
}

/**
 * Compact urgency SALE pill — red gradient, emphasized countdown, subtle pulse.
 * Uses data-radius="pill" to bypass the global sharp-corner reset in globals.css.
 */
export function FlashSaleCountdown({ className, compact = false }: FlashSaleCountdownProps) {
  const { isFlashSaleActive, formattedTime, timeRemaining } = useFlashSale();

  if (!isFlashSaleActive || timeRemaining <= 0) return null;

  const urgent = timeRemaining < 5 * 60 * 1000;

  const pill = (
    <div
      data-radius="pill"
      className={cn('flash-sale-countdown inline-flex shrink-0 items-center', className)}
      title="Flash Sale — 20% extra off everything!"
      style={{
        width: 'fit-content',
        maxWidth: 'none',
        height: compact ? 26 : 30,
        padding: compact ? '0 9px 0 8px' : '0 11px 0 10px',
        gap: compact ? 4 : 6,
        background: urgent
          ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 42%, #f97316 100%)'
          : 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #ef4444 100%)',
        border: '1px solid rgba(255, 120, 80, 0.55)',
        boxShadow: urgent
          ? '0 0 14px rgba(239, 68, 68, 0.35), 0 2px 10px -2px rgba(127, 29, 29, 0.6)'
          : '0 2px 10px -2px rgba(127, 29, 29, 0.55)',
        animation: urgent
          ? 'urgency-pulse-strong 2s ease-in-out infinite, flash-shake 0.6s ease-in-out infinite'
          : 'urgency-pulse 2.8s ease-in-out infinite',
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: compact ? 12 : 14,
          lineHeight: 1,
          color: '#facc15',
          filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.55))',
          animation: 'flash-fire 1.2s ease-in-out infinite alternate',
        }}
      >
        ⚡
      </span>

      {!compact ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#fff',
            opacity: 0.95,
          }}
        >
          Sale
        </span>
      ) : null}

      <span
        style={{
          fontSize: compact ? 11 : 13,
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.05em',
          color: '#fff',
          textShadow: '0 1px 6px rgba(0, 0, 0, 0.25)',
          lineHeight: 1,
        }}
      >
        {formattedTime}
      </span>
    </div>
  );

  return (
    <>
      {pill}
      <FlashSaleCountdownStyles />
    </>
  );
}

function FlashSaleCountdownStyles() {
  return (
    <style>{`
        @keyframes flash-fire {
          from { transform: scale(1) rotate(-4deg); opacity: 0.92; }
          to   { transform: scale(1.12) rotate(4deg); opacity: 1; }
        }
        @keyframes urgency-pulse {
          0%, 100% { box-shadow: 0 2px 10px -2px rgba(127, 29, 29, 0.55), 0 0 0 rgba(239, 68, 68, 0); }
          50%      { box-shadow: 0 2px 10px -2px rgba(127, 29, 29, 0.55), 0 0 16px rgba(239, 68, 68, 0.38); }
        }
        @keyframes urgency-pulse-strong {
          0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.3), 0 2px 10px -2px rgba(127, 29, 29, 0.6); }
          50%      { box-shadow: 0 0 20px rgba(249, 115, 22, 0.5), 0 2px 10px -2px rgba(127, 29, 29, 0.6); }
        }
        @keyframes flash-shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-1px); }
          75%       { transform: translateX(1px); }
        }
      `}</style>
  );
}
