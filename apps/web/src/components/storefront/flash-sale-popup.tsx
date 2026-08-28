import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useFlashSale } from '@/contexts/flash-sale-context';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/constants/routes';

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

  // Progress bar: fraction of the personal 60-min timer remaining (logged-in only)
  const progressPct =
    isAuthenticated && isFlashSaleActive
      ? Math.min(100, (timeRemaining / (60 * 60 * 1000)) * 100)
      : 0;

  return (
    <div
      ref={overlayRef}
      className="z-9999 fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(7px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) dismissUniversalPopup();
      }}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl shadow-[0_28px_90px_rgba(0,0,0,0.65)]"
        style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1a3a 45%, #0a0e1a 100%)',
          border: '1px solid rgba(0,180,216,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow rings */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow: 'inset 0 0 70px rgba(0,150,200,0.12), inset 0 0 130px rgba(255,100,0,0.07)',
            animation: 'fsp-glow 2.5s ease-in-out infinite alternate',
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={dismissUniversalPopup}
          aria-label="Close flash sale offer"
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* Top strip */}
        <div
          className="flex items-center justify-center gap-2 px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,100,0,0.25), transparent)',
            borderBottom: '1px solid rgba(255,100,0,0.25)',
          }}
        >
          <span>⚡</span>
          <span className="text-orange-300">Limited Time Flash Sale</span>
          <span>⚡</span>
        </div>

        {/* Main content */}
        <div className="px-8 py-6 text-center">
          {/* Headline */}
          <div
            className="mb-1 text-[2.6rem] font-black leading-none tracking-tight text-white"
            style={{ textShadow: '0 0 50px rgba(0,180,255,0.5), 0 2px 0 rgba(0,0,0,0.5)' }}
          >
            ⚡ FLASH SALE ⚡
          </div>

          <div
            className="mb-4 text-xl font-bold"
            style={{
              background: 'linear-gradient(90deg, #00d4ff, #ff8c00, #ff4500, #ff8c00, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '250% auto',
              animation: 'fsp-shimmer 4s linear infinite',
            }}
          >
            Extra 20% OFF Sitewide!
          </div>

          {/* Discount badge */}
          <div
            className="my-4 inline-flex flex-col items-center rounded-2xl px-10 py-4"
            style={{
              background: 'linear-gradient(135deg, #ff4500 0%, #ff8c00 100%)',
              boxShadow: '0 0 36px rgba(255,80,0,0.65), 0 6px 24px rgba(0,0,0,0.4)',
              animation: 'fsp-pulse 1.8s ease-in-out infinite',
            }}
          >
            <div className="text-[3.5rem] font-black leading-none text-white">20%</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-100">
              Extra Off Everything
            </div>
          </div>

          {isAuthenticated ? (
            /* Logged-in: personal message + countdown */
            <>
              <p className="mb-5 text-[13px] leading-relaxed text-white/70">
                Your personal flash sale is{' '}
                <span className="font-semibold text-orange-300">active now!</span> Enjoy an
                exclusive extra 20% off every item. Discount applied at checkout automatically.
              </p>

              {/* Personal countdown */}
              {isFlashSaleActive ? (
                <div className="mb-5">
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-400">
                    ⏱ Your offer expires in
                  </div>
                  <div
                    className="font-display text-[2.8rem] font-black tabular-nums text-white"
                    style={{
                      textShadow: '0 0 24px rgba(0,180,255,0.7)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formattedTime}
                  </div>
                  {/* Urgency progress bar */}
                  <div
                    className="mt-3 overflow-hidden rounded-full"
                    style={{ background: 'rgba(0,150,200,0.15)', height: 5 }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progressPct}%`,
                        background: 'linear-gradient(90deg, #0096c7, #ff8c00)',
                        transition: 'width 1s linear',
                        boxShadow: '0 0 10px rgba(0,180,255,0.6)',
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {/* CTA — logged in */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to={ROUTES.products}
                  onClick={dismissUniversalPopup}
                  className="flex-1 rounded-xl py-3.5 text-center text-[13px] font-black uppercase tracking-[0.15em] text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #0096c7, #0077b6)',
                    boxShadow: '0 4px 22px rgba(0,150,200,0.5)',
                  }}
                >
                  🛍️ Shop Now &amp; Save 20%
                </Link>
                <button
                  type="button"
                  onClick={dismissUniversalPopup}
                  className="flex-1 rounded-xl border border-white/15 py-3.5 text-[13px] font-medium text-white/50 transition-colors hover:border-white/30 hover:text-white/70"
                >
                  Maybe later
                </button>
              </div>

              <p className="mt-4 text-[10px] text-white/25">
                No code needed. Discount applied automatically at checkout for members.
              </p>
            </>
          ) : (
            /* Guest: sign in / register CTA, no countdown */
            <>
              <p className="mb-5 text-[13px] leading-relaxed text-white/70">
                This is a{' '}
                <span className="font-semibold text-orange-300">members-only flash sale.</span> Sign
                in or create a free account to unlock your personal 20% OFF — no code needed,
                discount shows at checkout.
              </p>

              {/* CTA — guest */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to={ROUTES.authLogin}
                  onClick={dismissUniversalPopup}
                  className="flex-1 rounded-xl py-3.5 text-center text-[13px] font-black uppercase tracking-[0.15em] text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                    boxShadow: '0 4px 22px rgba(255,80,0,0.5)',
                  }}
                >
                  🔑 Sign In to Unlock 20% OFF
                </Link>
                <Link
                  to={ROUTES.authRegister}
                  onClick={dismissUniversalPopup}
                  className="flex-1 rounded-xl border border-white/20 py-3.5 text-center text-[13px] font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  Create Free Account
                </Link>
              </div>

              <button
                type="button"
                onClick={dismissUniversalPopup}
                className="mt-3 w-full rounded-xl border border-white/10 py-2.5 text-[12px] font-medium text-white/35 transition-colors hover:border-white/20 hover:text-white/50"
              >
                Maybe later
              </button>

              <p className="mt-4 text-[10px] text-white/25">
                Members-only offer. Join free — no credit card required to sign up.
              </p>
            </>
          )}
        </div>

        {/* Bottom strip */}
        <div
          className="px-6 py-2 text-center text-[11px] font-medium text-sky-400/60"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,150,200,0.12), transparent)',
            borderTop: '1px solid rgba(0,150,200,0.18)',
          }}
        >
          ✦ Fashion Edge — Extra 20% OFF sitewide, limited time only ✦
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes fsp-glow {
          from { box-shadow: inset 0 0 70px rgba(0,150,200,0.1),  inset 0 0 130px rgba(255,100,0,0.06); }
          to   { box-shadow: inset 0 0 90px rgba(0,150,200,0.18), inset 0 0 160px rgba(255,100,0,0.10); }
        }
        @keyframes fsp-shimmer {
          0%   { background-position: 250% center; }
          100% { background-position: -250% center; }
        }
        @keyframes fsp-pulse {
          0%, 100% { transform: scale(1);     box-shadow: 0 0 36px rgba(255,80,0,0.6), 0 6px 24px rgba(0,0,0,0.4); }
          50%       { transform: scale(1.04); box-shadow: 0 0 55px rgba(255,80,0,0.9), 0 6px 32px rgba(0,0,0,0.5); }
        }
      `}</style>
    </div>
  );
}
