import { RoleModel } from '@/models/role.model';
import { PermissionModel } from '@/models/permission.model';
import { redisManager } from '@/config/redis';
import type { PermissionKey } from '@/constants/permissions';
import type { RoleKey } from '@/constants/roles';
import { ApiError } from '@/utils/errors/api-error';

const CACHE_TTL_SECONDS = 900;

export async function getPermissionsForRole(roleId: string): Promise<PermissionKey[]> {
  const cacheKey = `rbac:role:${roleId}`;

  if (redisManager.isConnected()) {
    const cached = await redisManager.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as PermissionKey[];
    }
  }

  const role = await RoleModel.findById(roleId).lean();
  if (!role || role.isDeleted || role.status !== 'active') {
    throw ApiError.forbidden('Role is inactive or missing');
  }

  const permissions = await PermissionModel.find({
    _id: { $in: role.permissionIds },
  })
    .select('key')
    .lean();

  const keys = permissions.map((p) => p.key as PermissionKey);

  if (redisManager.isConnected()) {
    await redisManager.getClient().set(cacheKey, JSON.stringify(keys), 'EX', CACHE_TTL_SECONDS);
  }

  return keys;
}

export async function invalidateRolePermissionCache(roleId: string): Promise<void> {
  if (!redisManager.isConnected()) return;
  await redisManager.getClient().del(`rbac:role:${roleId}`);
}

export async function findRoleByKey(key: RoleKey | string) {
  return RoleModel.findOne({ key, isDeleted: false, status: 'active' });
}

export function userHasPermission(
  userPermissions: PermissionKey[],
  required: PermissionKey[],
  mode: 'all' | 'any' = 'all',
): boolean {
  if (required.length === 0) return true;
  if (mode === 'any') {
    return required.some((perm) => userPermissions.includes(perm));
  }
  return required.every((perm) => userPermissions.includes(perm));
}

export function userHasRole(userRoleKey: RoleKey, allowed: RoleKey[]): boolean {
  return allowed.includes(userRoleKey);
}
