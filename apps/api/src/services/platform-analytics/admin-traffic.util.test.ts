import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import {
  excludeAdminAudience,
  isAdminAnalyticsPath,
  isStaffRoleKey,
} from './admin-traffic.util.js';

describe('admin traffic exclusion', () => {
  it('detects /admin paths only', () => {
    expect(isAdminAnalyticsPath('/admin')).toBe(true);
    expect(isAdminAnalyticsPath('/admin/analytics')).toBe(true);
    expect(isAdminAnalyticsPath('/admin?x=1')).toBe(true);
    expect(isAdminAnalyticsPath('/administrator')).toBe(false);
    expect(isAdminAnalyticsPath('/')).toBe(false);
    expect(isAdminAnalyticsPath(null)).toBe(false);
  });

  it('detects staff role keys', () => {
    expect(isStaffRoleKey('admin')).toBe(true);
    expect(isStaffRoleKey('super_admin')).toBe(true);
    expect(isStaffRoleKey('customer')).toBe(false);
    expect(isStaffRoleKey(null)).toBe(false);
  });

  it('adds staff + path exclusions under $and', () => {
    const id = new Types.ObjectId();
    const result = excludeAdminAudience({ startedAt: { $gte: new Date() } }, [id], 'entryPage');
    expect(result).toHaveProperty('$and');
    const and = (result as { $and: unknown[] }).$and;
    expect(and).toHaveLength(3);
    expect(and[1]).toEqual({ userId: { $nin: [id] } });
    expect(and[2]).toMatchObject({ entryPage: { $not: expect.any(Object) } });
  });
});
