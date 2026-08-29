import { useFlashSale } from '@/contexts/flash-sale-context';
import { cn } from '@/lib/utils';

interface FlashSaleCountdownProps {
  className?: string;
}

/**
 * Flash-sale timer pill — dark red (sale red) on every surface.
 * Returns null when the countdown hits 00:00 / sale ends.
 */
export function FlashSaleCountdown({ className }: FlashSaleCountdownProps) {
  const { isFlashSaleActive, formattedTime, timeRemaining } = useFlashSale();

  if (!isFlashSaleActive || timeRemaining <= 0) return null;

  return (
    <div
      className={cn(
        'flash-sale-countdown inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white sm:gap-1.5 sm:px-2.5 sm:text-xs',
        className,
      )}
      title="Flash Sale — 20% extra off everything!"
      style={{
        background: '#C41E3A',
        boxShadow: '0 2px 10px -2px rgba(196,30,58,0.55)',
        animation:
          timeRemaining < 5 * 60 * 1000 ? 'flash-shake 0.5s ease-in-out infinite' : undefined,
      }}
    >
      <span
        className="text-sm leading-none sm:text-[15px]"
        aria-hidden
        style={{
          background: 'linear-gradient(180deg, #FFE566 0%, #FF8C00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'flash-fire 1s ease-in-out infinite alternate',
        }}
      >
        ⚡
      </span>

      <span className="hidden sm:inline" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
        Sale
      </span>

      <span
        className="tabular-nums"
        style={{
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
        }}
      >
        {formattedTime}
      </span>

      <style>{`
        @keyframes flash-fire {
          from { transform: scale(1) rotate(-5deg); }
          to   { transform: scale(1.15) rotate(5deg); }
        }
        @keyframes flash-shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-2px) rotate(-1deg); }
          75%       { transform: translateX(2px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}
