import { useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useAuthStore } from '@/store/auth-store';
import {
  setup,
  teardown,
  trackRouteChange,
  flush,
  startFlushInterval,
  stopFlushInterval,
  initPostHog,
  posthogIdentify,
  posthogReset,
  posthogPageView,
} from '@/lib/analytics';
import { captureAttribution } from '@/lib/analytics/attribution';
import { CookieConsentBanner } from '@/components/analytics/CookieConsentBanner';

/**
 * Mount once inside storefront layouts (not admin).
 * First-party source/geo tracking starts immediately — ads are not lost if the banner is ignored.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const prevUserId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    captureAttribution();
    if (!initialized.current) {
      initialized.current = true;
      void initPostHog();
      setup();
      startFlushInterval();
    }

    return () => {
      initialized.current = false;
      teardown();
      stopFlushInterval();
      void flush();
    };
  }, []);

  useEffect(() => {
    const path = location.pathname;
    trackRouteChange(path);
    posthogPageView(path);
    const t = window.setTimeout(() => void flush(), 300);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid === prevUserId.current) return;
    prevUserId.current = uid;

    if (uid) {
      posthogIdentify(uid, {
        email: user?.email,
        name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
        role: user?.roleKey,
      });
    } else {
      posthogReset();
    }
  }, [user]);

  return (
    <>
      {children}
      <CookieConsentBanner />
    </>
  );
}
