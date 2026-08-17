/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_CDN_URL: string;
  readonly VITE_SOCKET_URL: string;
  /** Optional — PostHog JS public key. Analytics no-ops when absent. */
  readonly VITE_POSTHOG_KEY?: string;
  /** Optional — PostHog host, defaults to https://app.posthog.com */
  readonly VITE_POSTHOG_HOST?: string;
  /** Meta Pixel ID for browser-side fbq tracking. */
  readonly VITE_META_PIXEL_ID?: string;
  /** Optional Meta Test Events code (TEST12345). Prefer ?test_event_code= on the shop URL. */
  readonly VITE_META_TEST_EVENT_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
