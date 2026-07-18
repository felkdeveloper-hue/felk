import { RoleModel } from '@/models/role.model';
import { PermissionModel } from '@/models/permission.model';
import type { PermissionKey } from '@/constants/permissions';
import type { RoleKey } from '@/constants/roles';
import { ApiError } from '@/utils/errors/api-error';

export async function getPermissionsForRole(roleId: string): Promise<PermissionKey[]> {
  const role = await RoleModel.findById(roleId).lean();
  if (!role || role.isDeleted || role.status !== 'active') {
    throw ApiError.forbidden('Role is inactive or missing');
  }

  const permissions = await PermissionModel.find({
    _id: { $in: role.permissionIds },
  })
    .select('key')
    .lean();

  return permissions.map((p) => p.key as PermissionKey);
}

export async function invalidateRolePermissionCache(_roleId: string): Promise<void> {
  // No cache layer without Redis.
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
