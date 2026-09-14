import { describe, expect, it } from 'vitest';
import {
  fedStatusMessage,
  formatFedContact,
  isFedInvalidOrderIdStatus,
  sanitizeFedOrderId,
} from '@/services/couriers/fed.types.js';

describe('fedStatusMessage', () => {
  it('uses different meanings for the same code on new vs existing APIs', () => {
    expect(fedStatusMessage(202, 'new')).toMatch(/order reference/i);
    expect(fedStatusMessage(202, 'existing')).toMatch(/already used/i);
    expect(fedStatusMessage(205, 'existing')).toMatch(/order reference/i);
    expect(fedStatusMessage(209, 'existing')).toMatch(/phone/i);
    expect(fedStatusMessage(209, 'new')).toMatch(/city/i);
  });
});

describe('sanitizeFedOrderId', () => {
  it('strips hyphens from FE order numbers', () => {
    expect(sanitizeFedOrderId('ORD-MTZKDIR4-6D46A5')).toBe('ORDMTZKDIR46D46A5');
  });
});

describe('formatFedContact', () => {
  it('restores the trunk zero for a 9-digit mobile', () => {
    expect(formatFedContact('703373164')).toBe('0703373164');
  });
});

describe('isFedInvalidOrderIdStatus', () => {
  it('maps 202 on new and 205 on existing', () => {
    expect(isFedInvalidOrderIdStatus(202, 'new')).toBe(true);
    expect(isFedInvalidOrderIdStatus(202, 'existing')).toBe(false);
    expect(isFedInvalidOrderIdStatus(205, 'existing')).toBe(true);
  });
});
