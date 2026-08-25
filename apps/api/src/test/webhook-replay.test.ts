import { describe, expect, it } from 'vitest';
import { webhookRecordNeedsReplay } from '@/utils/webhook-replay.js';

describe('webhookRecordNeedsReplay', () => {
  it('replays unfinished or failed Koko callbacks so a crashed first try cannot hide a capture', () => {
    expect(
      webhookRecordNeedsReplay({ processed: false, verified: false, processingResult: null }),
    ).toBe(true);
    expect(
      webhookRecordNeedsReplay({
        processed: true,
        verified: false,
        processingResult: 'invalid_signature',
      }),
    ).toBe(true);
    expect(
      webhookRecordNeedsReplay({ processed: false, verified: false, processingResult: 'error' }),
    ).toBe(true);
  });

  it('does not replay a webhook that already created the paid order', () => {
    expect(
      webhookRecordNeedsReplay({ processed: true, verified: true, processingResult: 'success' }),
    ).toBe(false);
    expect(
      webhookRecordNeedsReplay({
        processed: true,
        verified: true,
        processingResult: 'ignored_after_paid',
      }),
    ).toBe(false);
  });
});
