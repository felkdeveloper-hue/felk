import { describe, expect, it } from 'vitest';
import { normalizeStockControlNumber, stockControlNumberKey } from './stock-control-number.js';

describe('normalizeStockControlNumber', () => {
  it('trims and keeps a real value', () => {
    expect(normalizeStockControlNumber('  31/11  ')).toBe('31/11');
  });

  it('turns blank or non-string values into null', () => {
    expect(normalizeStockControlNumber('')).toBeNull();
    expect(normalizeStockControlNumber('   ')).toBeNull();
    expect(normalizeStockControlNumber(null)).toBeNull();
    expect(normalizeStockControlNumber(undefined)).toBeNull();
  });
});

describe('stockControlNumberKey', () => {
  it('compares numbers without regard to case or surrounding space', () => {
    expect(stockControlNumberKey('  SC-10042  ')).toBe(stockControlNumberKey('sc-10042'));
  });
});
