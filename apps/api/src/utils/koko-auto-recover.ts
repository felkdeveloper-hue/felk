/** Look back this far when matching already-captured Koko payments to admin orders. */
export const KOKO_RECOVER_LOOKBACK_MS = 21 * 24 * 60 * 60 * 1000;

/**
 * Merchant-dashboard captures reported to us that never got a webhook/return.
 * Do not add processing/failed attempts here — only Success-tab captures.
 */
export const CONFIRMED_KOKO_CAPTURED_PREFIXES = ['PAY-MT4OEBC4-B8BAD7', 'PAY-MT4OEBC4'] as const;

/** Admin orders created from unverified Koko auto-recovery (money was never captured). */
export const UNVERIFIED_KOKO_ORDER_NUMBERS = [
  'ORD-MT5U6N0E-7DFA9D',
  'ORD-MT5U46JR-A9B8F7',
] as const;

export function kokoReferenceIsConfirmedCapture(referenceNumber: string): boolean {
  const ref = referenceNumber.toUpperCase();
  return CONFIRMED_KOKO_CAPTURED_PREFIXES.some((prefix) => ref.startsWith(prefix.toUpperCase()));
}
