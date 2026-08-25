/** A webhook that never finished (or failed verify) must be tried again — not dropped as a duplicate. */
export function webhookRecordNeedsReplay(webhook: {
  processed?: boolean;
  verified?: boolean;
  processingResult?: string | null;
}): boolean {
  const result = webhook.processingResult ?? '';
  if (
    webhook.verified &&
    webhook.processed &&
    (result === 'success' || result === 'ignored_after_paid')
  ) {
    return false;
  }
  return true;
}
