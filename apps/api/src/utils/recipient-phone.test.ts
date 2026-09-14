import { describe, expect, it } from 'vitest';
import {
  isValidRecipientPhone,
  normalizeRecipientPhone,
  pickValidRecipientPhoneRaw,
} from '@/utils/recipient-phone.js';

describe('normalizeRecipientPhone', () => {
  it('strips a Sri Lanka country code and leading zero', () => {
    expect(normalizeRecipientPhone('+94703373164')).toBe('703373164');
    expect(normalizeRecipientPhone('0703373164')).toBe('703373164');
    expect(normalizeRecipientPhone('703373164')).toBe('703373164');
  });

  it('drops non-digits so a name is empty', () => {
    expect(normalizeRecipientPhone('Chanuka')).toBe('');
  });
});

describe('isValidRecipientPhone', () => {
  it('accepts local and international Sri Lanka mobiles', () => {
    expect(isValidRecipientPhone('0703373164')).toBe(true);
    expect(isValidRecipientPhone('+94703373164')).toBe(true);
  });

  it('rejects a last name typed into the phone field', () => {
    expect(isValidRecipientPhone('Chanuka')).toBe(false);
    expect(isValidRecipientPhone('')).toBe(false);
    expect(isValidRecipientPhone(null)).toBe(false);
  });
});

describe('pickValidRecipientPhoneRaw', () => {
  it('skips invalid address values and keeps the account mobile', () => {
    expect(pickValidRecipientPhoneRaw(['Chanuka', 'Dushanka', '0703373164'])).toBe('0703373164');
  });

  it('returns null when nothing is a real number', () => {
    expect(pickValidRecipientPhoneRaw(['Chanuka', '', null])).toBeNull();
  });
});
