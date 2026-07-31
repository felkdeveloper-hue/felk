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

/**
 * Mount once inside storefront layouts (not admin).
 * Handles: route tracking, PostHog init, user identification, flush lifecycle.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const prevUserId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void initPostHog();
    setup();
    startFlushInterval();

    return () => {
      teardown();
      stopFlushInterval();
      void flush();
    };
  }, []);

  // Route change tracking
  useEffect(() => {
    const path = location.pathname;
    trackRouteChange(path);
    posthogPageView(path);
    // Flush quickly so Live + page views update without waiting for the interval
    const t = window.setTimeout(() => void flush(), 300);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  // User identity sync
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

  return <>{children}</>;
}
