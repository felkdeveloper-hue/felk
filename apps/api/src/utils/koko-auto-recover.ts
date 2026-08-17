const KOKO_STUCK_MIN_AGE_MS = 10 * 60 * 1000;
const KOKO_STUCK_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** True when a Koko payment has waited long enough that webhook/return should already have landed. */
export function kokoStuckPaymentIsDue(createdAt: Date, now = new Date()): boolean {
  const ageMs = now.getTime() - createdAt.getTime();
  return ageMs >= KOKO_STUCK_MIN_AGE_MS && ageMs <= KOKO_STUCK_MAX_AGE_MS;
}

export const KOKO_RECOVER_LOOKBACK_MS = 21 * 24 * 60 * 60 * 1000;
