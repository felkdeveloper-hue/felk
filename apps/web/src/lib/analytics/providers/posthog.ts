/**
 * PostHog provider — no-ops gracefully when VITE_POSTHOG_KEY is absent.
 */
let posthogInstance: import('posthog-js').PostHog | null = null;

export async function initPostHog(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com';
  if (!key) return;

  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // we track ourselves
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage',
    });
    posthogInstance = posthog;
  } catch {
    /* posthog-js not installed or blocked — graceful no-op */
  }
}

export function posthogIdentify(userId: string, traits?: Record<string, unknown>): void {
  posthogInstance?.identify(userId, traits);
}

export function posthogReset(): void {
  posthogInstance?.reset();
}

export function posthogCapture(event: string, properties?: Record<string, unknown>): void {
  posthogInstance?.capture(event, properties);
}

export function posthogPageView(path: string): void {
  posthogInstance?.capture('$pageview', { $current_url: window.location.href, path });
}
