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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
