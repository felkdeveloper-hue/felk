import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useFlashSale } from '@/contexts/flash-sale-context';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/constants/routes';

const ONE_HOUR_MS = 60 * 60 * 1000;

const MODAL_BG =
  'radial-gradient(circle at top right, rgba(239, 68, 68, 0.25), transparent 40%), linear-gradient(135deg, #111827, #1f2937)';

const OFFER_GRADIENT = 'linear-gradient(135deg, #ef4444, #f97316, #f59e0b)';

const CTA_GRADIENT = 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)';

const PROGRESS_GRADIENT = 'linear-gradient(90deg, #ef4444, #f97316, #f59e0b)';

/** Compact mobile-only urgency block — must not affect desktop layout. */
function MobileFlashUrgency({ live }: { live: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 md:hidden">
      {live ? (
        <div className="flex items-center justify-center gap-1">
          <span
            aria-hidden
            className="fsp-live-dot inline-block size-1.5 shrink-0 rounded-full bg-[#ff3b30]"
          />
          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#ff6b35]">
            Offer live now
          </span>
        </div>
      ) : (
        <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-orange-400/90">
          ⚡ Your exclusive offer is live
        </div>
      )}

      <p
        className="fsp-urgency-glow text-[12px] font-black uppercase leading-none tracking-[0.04em]"
        style={{
          background: 'linear-gradient(90deg, #ff3b30, #ff6b35, #ff9f1c)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Don&apos;t miss out!
      </p>

      <p className="max-w-[260px] text-[9px] leading-tight text-white/50">
        Your 20% OFF disappears when the timer ends.
      </p>
    </div>
  );
}

export function FlashSalePopup() {
  const {
    showUniversalPopup,
    dismissUniversalPopup,
    isFlashSaleActive,
    formattedTime,
    timeRemaining,
  } = useFlashSale();
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showUniversalPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showUniversalPopup]);

  if (!showUniversalPopup) return null;

  const progressPct = isFlashSaleActive ? Math.min(100, (timeRemaining / ONE_HOUR_MS) * 100) : 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) dismissUniversalPopup();
      }}
    >
      <div
        className="relative max-h-[88vh] w-[calc(100%-32px)] max-w-[420px] overflow-y-auto rounded-2xl shadow-[0_28px_90px_rgba(0,0,0,0.7)] md:max-h-none md:w-full md:max-w-lg"
        style={{
          background: MODAL_BG,
          border: '1px solid rgba(239, 68, 68, 0.28)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warm ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow:
              'inset 0 0 80px rgba(239, 68, 68, 0.08), inset 0 0 120px rgba(249, 115, 22, 0.06)',
            animation: 'fsp-glow 3s ease-in-out infinite alternate',
          }}
        />

        {/* Close */}
        <button
          type="button"
          onClick={dismissUniversalPopup}
          aria-label="Close flash sale offer"
          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white md:right-3 md:top-3 md:size-8"
        >
          <X className="size-3.5 md:size-4" />
        </button>

        {/* Top strip */}
        <div
          className="flex items-center justify-center gap-1 px-4 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] md:gap-1.5 md:py-2 md:text-[10px] md:tracking-[0.2em]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.18), transparent)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.22)',
            color: '#fcd34d',
          }}
        >
          <span aria-hidden>⚡</span>
          <span className="md:hidden">Limited Time Sale</span>
          <span className="hidden md:inline">Limited Time Flash Sale</span>
          <span aria-hidden>⚡</span>
        </div>

        {/* Main content — compact gap on mobile, desktop spacing from md up */}
        <div className="flex flex-col gap-2 px-4 py-[18px] text-center md:gap-0 md:px-8 md:py-6">
          {/* FLASH SALE headline */}
          <div
            className="text-[1.35rem] font-black leading-none tracking-tight text-white md:mb-1 md:text-[2.5rem]"
            style={{ textShadow: '0 2px 24px rgba(239, 68, 68, 0.35)' }}
          >
            ⚡ FLASH SALE ⚡
          </div>

          {/* 20% OFF hero block */}
          <div
            className="mx-auto inline-flex flex-col items-center rounded-xl px-3 py-4 md:my-4 md:rounded-2xl md:px-10 md:py-4"
            style={{
              background: OFFER_GRADIENT,
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.45), 0 4px 16px rgba(0,0,0,0.35)',
            }}
          >
            <div className="text-[1.75rem] font-black leading-none text-white md:text-[3.25rem]">
              20% OFF
            </div>
            <div className="mt-0.5 hidden text-[9px] font-bold uppercase tracking-[0.2em] text-white/90 md:mt-1 md:block md:text-[10px]">
              Extra Off Everything
            </div>
          </div>

          {/* Desktop — full urgency block */}
          <div
            className="mb-4 hidden rounded-xl px-4 py-3 md:block"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
            }}
          >
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">
              ⏱ Your Personal Offer
            </div>
            <div className="text-[15px] font-extrabold leading-snug text-white">
              You have ONLY 1 HOUR
              <br />
              to grab anything you want!
            </div>
          </div>

          {isFlashSaleActive ? (
            <>
              {/* Desktop — full description */}
              <p className="mb-4 hidden text-[13px] leading-relaxed text-white/75 md:block">
                Your personal flash sale is{' '}
                <span className="font-semibold text-orange-300">active now</span>. Shop any product
                before your time runs out — discount applied automatically at checkout.
              </p>

              <MobileFlashUrgency live />

              {/* Countdown */}
              <div className="my-0 md:my-1 md:mb-4">
                <div className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-white/55 md:mb-1 md:text-[10px] md:tracking-[0.18em]">
                  Offer expires in
                </div>
                <div
                  className="font-display text-[1.85rem] font-black tabular-nums text-white md:text-[2.75rem]"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    textShadow:
                      '0 0 28px rgba(239, 68, 68, 0.55), 0 0 48px rgba(249, 115, 22, 0.25)',
                  }}
                >
                  {formattedTime}
                </div>

                <div
                  className="mt-1.5 h-1 overflow-hidden rounded-full md:mt-3 md:h-[5px]"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      background: PROGRESS_GRADIENT,
                      transition: 'width 1s linear',
                      boxShadow: '0 0 12px rgba(249, 115, 22, 0.45)',
                    }}
                  />
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2 md:gap-2">
                <Link
                  to={ROUTES.products}
                  onClick={dismissUniversalPopup}
                  className="rounded-[14px] px-4 py-3.5 text-center text-[11px] font-black uppercase tracking-[0.08em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:rounded-xl md:py-3.5 md:text-[13px] md:tracking-[0.1em]"
                  style={{
                    background: CTA_GRADIENT,
                    boxShadow: '0 6px 24px rgba(239, 68, 68, 0.45)',
                  }}
                >
                  🛍️ Shop Now &amp; Save 20%
                </Link>
                <button
                  type="button"
                  onClick={dismissUniversalPopup}
                  className="border-white/12 rounded-[10px] border px-3 py-2 text-[10px] font-medium text-white/40 transition-colors hover:border-white/25 hover:text-white/60 md:rounded-xl md:py-3 md:text-[12px] md:text-white/45"
                >
                  Maybe later
                </button>
              </div>

              <p className="mt-3 hidden text-[10px] text-white/30 md:block">
                No code needed. Every user gets one personal 1-hour window — discount applied
                automatically at checkout.
              </p>
            </>
          ) : isAuthenticated ? (
            <>
              <MobileFlashUrgency live={false} />

              <p className="hidden text-[13px] leading-relaxed text-white/70 md:mb-4 md:block">
                Your personal 1-hour flash sale window is starting. Browse now and save 20% on
                everything — discount applied automatically at checkout.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to={ROUTES.products}
                  onClick={dismissUniversalPopup}
                  className="rounded-[14px] px-4 py-3.5 text-center text-[11px] font-black uppercase tracking-[0.08em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:rounded-xl md:py-3.5 md:text-[13px] md:tracking-[0.1em]"
                  style={{
                    background: CTA_GRADIENT,
                    boxShadow: '0 6px 24px rgba(239, 68, 68, 0.45)',
                  }}
                >
                  🛍️ Shop Now &amp; Save 20%
                </Link>
                <button
                  type="button"
                  onClick={dismissUniversalPopup}
                  className="border-white/12 rounded-[10px] border px-3 py-2 text-[10px] font-medium text-white/40 transition-colors hover:border-white/25 hover:text-white/60 md:rounded-xl md:py-3 md:text-[12px] md:text-white/45"
                >
                  Maybe later
                </button>
              </div>
            </>
          ) : (
            <>
              <MobileFlashUrgency live={false} />

              <p className="hidden text-[13px] leading-relaxed text-white/70 md:mb-4 md:block">
                Every visitor gets a{' '}
                <span className="font-semibold text-orange-300">personal 1-hour window</span> with
                20% off everything. Start shopping now — no code needed, discount shows at checkout.
              </p>

              <div className="flex flex-col gap-2 md:flex-row">
                <Link
                  to={ROUTES.products}
                  onClick={dismissUniversalPopup}
                  className="flex-1 rounded-[14px] px-4 py-3.5 text-center text-[11px] font-black uppercase tracking-[0.08em] text-white transition-transform hover:scale-[1.02] active:scale-[0.98] md:rounded-xl md:py-3.5 md:text-[13px] md:tracking-[0.1em]"
                  style={{
                    background: CTA_GRADIENT,
                    boxShadow: '0 6px 24px rgba(239, 68, 68, 0.45)',
                  }}
                >
                  🛍️ Shop Now &amp; Save 20%
                </Link>
                <Link
                  to={ROUTES.authLogin}
                  onClick={dismissUniversalPopup}
                  className="hidden flex-1 rounded-xl border border-white/20 py-3.5 text-center text-[12px] font-semibold text-white/75 transition-colors hover:border-white/35 hover:text-white md:block"
                >
                  Sign In
                </Link>
              </div>

              <button
                type="button"
                onClick={dismissUniversalPopup}
                className="border-white/12 rounded-[10px] border px-3 py-2 text-[10px] font-medium text-white/40 transition-colors hover:border-white/25 hover:text-white/60 md:mt-2 md:w-full md:rounded-xl md:border-white/10 md:py-3 md:text-[12px] md:text-white/40"
              >
                Maybe later
              </button>
            </>
          )}
        </div>

        {/* Bottom strip — desktop only */}
        <div
          className="hidden px-4 py-2 text-center text-[10px] font-medium text-orange-300/70 md:block"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.1), transparent)',
            borderTop: '1px solid rgba(239, 68, 68, 0.15)',
          }}
        >
          ✦ Fashion Edge — Personal 1-hour flash sale, 20% off sitewide ✦
        </div>
      </div>

      <style>{`
        @keyframes fsp-glow {
          from { box-shadow: inset 0 0 60px rgba(239, 68, 68, 0.06), inset 0 0 100px rgba(249, 115, 22, 0.04); }
          to   { box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.12), inset 0 0 130px rgba(249, 115, 22, 0.08); }
        }
        @keyframes fsp-live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.35); }
          50%      { opacity: 0.88; transform: scale(1.15); box-shadow: 0 0 5px 2px rgba(255, 59, 48, 0.4); }
        }
        @keyframes fsp-urgency-glow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 107, 53, 0.25)); }
          50%      { filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.5)); }
        }
        .fsp-live-dot { animation: fsp-live-pulse 2.8s ease-in-out infinite; }
        .fsp-urgency-glow { animation: fsp-urgency-glow 3.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
