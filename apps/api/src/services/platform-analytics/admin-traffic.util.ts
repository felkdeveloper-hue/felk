import { Types } from 'mongoose';
import { STAFF_ROLES } from '@/constants/auth.js';
import { UserModel } from '@/models/user.model.js';

/** Admin UI paths — never count as shopper landers/visitors. */
export const ADMIN_PATH_REGEX = /^\/admin(?:\/|$)/i;

export function isAdminAnalyticsPath(path?: string | null): boolean {
  if (!path) return false;
  const bare = path.split('?')[0] ?? '';
  return ADMIN_PATH_REGEX.test(bare);
}

export function isStaffRoleKey(roleKey?: string | null): boolean {
  return Boolean(roleKey && (STAFF_ROLES as readonly string[]).includes(roleKey));
}

/** Staff/admin account ids — exclude from Meta-style audience metrics (guests + customers stay). */
export async function resolveStaffUserIds(): Promise<Types.ObjectId[]> {
  const rows = await UserModel.find({
    isDeleted: false,
    roleKey: { $in: [...STAFF_ROLES] },
  })
    .select('_id')
    .lean();
  return rows.map((r) => r._id as Types.ObjectId);
}

/**
 * Narrow a session/visitor/page-view match so staff-linked rows and `/admin` paths
 * do not inflate landers / visitors / related overview audience KPIs.
 *
 * Uses `$nor` (not `$nin` / `$not`) so guest rows with `userId: null` / missing path
 * stay included — `$nin` alone is fine for nulls, but `$not+$regex` on path fields
 * has been observed to over-exclude in composed `$and` audience queries.
 */
export function excludeAdminAudience(
  match: Record<string, unknown>,
  staffIds: Types.ObjectId[],
  pathField?: 'entryPage' | 'path' | 'landingPath' | 'lastPage',
): Record<string, unknown> {
  const nor: Record<string, unknown>[] = [];
  if (staffIds.length > 0) {
    nor.push({ userId: { $in: staffIds } });
  }
  if (pathField) {
    nor.push({ [pathField]: { $regex: ADMIN_PATH_REGEX.source, $options: 'i' } });
  }
  if (nor.length === 0) return match;
  return { $and: [match, { $nor: nor }] };
}
