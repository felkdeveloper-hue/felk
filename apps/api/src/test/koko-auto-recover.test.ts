import { describe, expect, it } from 'vitest';
import {
  kokoReferenceIsConfirmedCapture,
  kokoSuccessFallbackAllowed,
} from '@/utils/koko-auto-recover.js';

describe('kokoReferenceIsConfirmedCapture', () => {
  it('matches a merchant Success-tab capture without treating failed attempts as paid', () => {
    expect(kokoReferenceIsConfirmedCapture('PAY-MT4OEBC4-B8BAD7-A1')).toBe(true);
    expect(kokoReferenceIsConfirmedCapture('PAY-MT848AC4-08012B')).toBe(true);
    expect(kokoReferenceIsConfirmedCapture('PAY-MT5U46JR-A9B8F7')).toBe(false);
  });

  it('accepts a signed Koko SUCCESS for a live checkout and rejects unsigned or failed payments', () => {
    const signature = 'A'.repeat(88);
    expect(
      kokoSuccessFallbackAllowed({
        status: 'SUCCESS',
        trnId: '25ea0615e923bac462e2eee65829c5b0',
        signature,
        paymentStatus: 'processing',
      }),
    ).toBe(true);
    expect(
      kokoSuccessFallbackAllowed({
        status: 'SUCCESS',
        trnId: 'TX1',
        signature,
        paymentStatus: 'processing',
      }),
    ).toBe(false);
    expect(
      kokoSuccessFallbackAllowed({
        status: 'SUCCESS',
        trnId: '00011078092',
        signature: '',
        paymentStatus: 'processing',
      }),
    ).toBe(false);
    expect(
      kokoSuccessFallbackAllowed({
        status: 'SUCCESS',
        trnId: '00011078092',
        signature,
        paymentStatus: 'failed',
      }),
    ).toBe(false);
    expect(
      kokoSuccessFallbackAllowed({
        status: 'FAILED',
        trnId: '00011078092',
        signature,
        paymentStatus: 'processing',
      }),
    ).toBe(false);
  });
});
