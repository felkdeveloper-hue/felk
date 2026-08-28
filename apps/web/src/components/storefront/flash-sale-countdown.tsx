import { useFlashSale } from '@/contexts/flash-sale-context';
import { cn } from '@/lib/utils';

interface FlashSaleCountdownProps {
  /** Pass true when the header is transparent/light-chrome (home page hero) */
  lightChrome?: boolean;
  className?: string;
}

export function FlashSaleCountdown({ lightChrome, className }: FlashSaleCountdownProps) {
  const { isFlashSaleActive, formattedTime, timeRemaining } = useFlashSale();

  if (!isFlashSaleActive || timeRemaining <= 0) return null;

  return (
    <div
      className={cn(
        'flash-sale-countdown flex items-center gap-1.5 px-3 py-1 text-xs font-bold',
        lightChrome ? 'bg-white/10 text-white backdrop-blur-sm' : 'bg-red-600 text-white',
        className,
      )}
      title="Flash Sale — 20% extra off everything!"
      style={{
        borderRadius: '999px',
        animation:
          timeRemaining < 5 * 60 * 1000 ? 'flash-shake 0.5s ease-in-out infinite' : undefined,
      }}
    >
      {/* Fire icon */}
      <span
        className="text-sm leading-none"
        aria-hidden
        style={{ animation: 'flash-fire 1s ease-in-out infinite alternate' }}
      >
        ⚡
      </span>

      {/* Label */}
      <span className="hidden uppercase tracking-wide sm:inline" style={{ fontSize: '10px' }}>
        Sale
      </span>

      {/* Timer */}
      <span
        className="font-black tabular-nums"
        style={{
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 8px rgba(255,200,0,0.6)',
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
