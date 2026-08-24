import { describe, expect, it } from 'vitest';
import { kokoReferenceIsConfirmedCapture } from '@/utils/koko-auto-recover.js';

describe('kokoReferenceIsConfirmedCapture', () => {
  it('matches a merchant Success-tab capture without treating failed attempts as paid', () => {
    expect(kokoReferenceIsConfirmedCapture('PAY-MT4OEBC4-B8BAD7-A1')).toBe(true);
    expect(kokoReferenceIsConfirmedCapture('PAY-MT5U46JR-A9B8F7')).toBe(false);
  });
});
