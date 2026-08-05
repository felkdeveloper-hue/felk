/**
 * Local-dev-only pacing for admin polling.
 * Production keeps the existing live intervals — these values never ship slower site UX.
 */
export const ADMIN_REFETCH_MS = import.meta.env.DEV ? 120_000 : 15_000;
export const ADMIN_LIVE_REFETCH_MS = import.meta.env.DEV ? 60_000 : 8_000;
