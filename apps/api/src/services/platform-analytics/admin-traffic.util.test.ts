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

  it('adds staff + path exclusions under $nor (guests with null userId stay matchable)', () => {
    const id = new Types.ObjectId();
    const base = { startedAt: { $gte: new Date() } };
    const result = excludeAdminAudience(base, [id], 'entryPage');
    expect(result).toEqual({
      $and: [
        base,
        {
          $nor: [
            { userId: { $in: [id] } },
            { entryPage: { $regex: expect.any(String), $options: 'i' } },
          ],
        },
      ],
    });
    const nor = (result as { $and: { $nor: Record<string, unknown>[] }[] }).$and[1].$nor;
    // Must NOT use userId:$nin — guests (userId null) must remain in the audience.
    expect(
      nor.some(
        (c) =>
          'userId' in c &&
          c.userId &&
          typeof c.userId === 'object' &&
          '$nin' in (c.userId as object),
      ),
    ).toBe(false);
    expect(nor[0]).toEqual({ userId: { $in: [id] } });
  });

  it('leaves match unchanged when there are no staff ids and no path field', () => {
    const base = { viewedAt: { $gte: new Date() } };
    expect(excludeAdminAudience(base, [])).toBe(base);
  });

  it('path-only exclusion still uses $nor so null paths are kept', () => {
    const base = { lastSeenAt: { $gte: new Date() } };
    const result = excludeAdminAudience(base, [], 'landingPath');
    expect(result).toHaveProperty('$and');
    const and = (result as { $and: unknown[] }).$and;
    expect(and).toHaveLength(2);
    expect(and[1]).toEqual({
      $nor: [{ landingPath: { $regex: expect.any(String), $options: 'i' } }],
    });
  });
});
