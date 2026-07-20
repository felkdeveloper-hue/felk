/**
 * Seed permissions, roles, and optional super admin.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api seed:auth
 *
 * Env (optional):
 *   SEED_SUPER_ADMIN_EMAIL
 *   SEED_SUPER_ADMIN_PASSWORD
 *   SEED_SUPER_ADMIN_FIRST_NAME
 *   SEED_SUPER_ADMIN_LAST_NAME
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { ROLE_SEED } from '@/constants/rbac-seed';
import { PERMISSION_LIST } from '@/constants/permissions';
import { ROLES } from '@/constants/roles';
import { USER_STATUS } from '@/constants/auth';
import { PermissionModel, RoleModel, UserModel } from '@/models';
import { hashPassword } from '@/utils/password.helper';

async function seedPermissions() {
  for (const key of PERMISSION_LIST) {
    const [module, action] = key.split('.');
    await PermissionModel.updateOne(
      { key },
      {
        $set: {
          key,
          module: module ?? 'general',
          action: action ?? 'manage',
          description: key,
          isSystem: true,
        },
      },
      { upsert: true },
    );
  }

  logger.info({ count: PERMISSION_LIST.length }, 'Permissions seeded');
}

async function seedRoles() {
  for (const role of ROLE_SEED) {
    const permissionDocs = await PermissionModel.find({
      key: { $in: role.permissions },
    }).select('_id');

    await RoleModel.updateOne(
      { key: role.key },
      {
        $set: {
          key: role.key,
          name: role.name,
          description: role.description,
          permissionIds: permissionDocs.map((p) => p._id),
          isSystem: true,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }

  logger.info({ count: ROLE_SEED.length }, 'Roles seeded');
}

async function seedSuperAdmin() {
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@feplatform.com').toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe!123';
  const firstName = process.env.SEED_SUPER_ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.SEED_SUPER_ADMIN_LAST_NAME ?? 'Admin';

  const role = await RoleModel.findOne({ key: ROLES.SUPER_ADMIN });
  if (!role) {
    throw new Error('Super admin role missing after seed');
  }

  const passwordHash = await hashPassword(password);
  const existing = await UserModel.findOne({ email });

  if (existing) {
    // Local/dev convenience: keep credentials in sync with seed defaults / env overrides.
    existing.passwordHash = passwordHash;
    existing.roleId = role._id;
    existing.roleKey = ROLES.SUPER_ADMIN;
    existing.status = USER_STATUS.ACTIVE;
    existing.emailVerifiedAt = existing.emailVerifiedAt ?? new Date();
    existing.firstName = firstName;
    existing.lastName = lastName;
    await existing.save();
    logger.info({ email }, 'Super admin updated (password reset from seed)');
    return;
  }

  await UserModel.create({
    email,
    passwordHash,
    passwordHistory: [],
    firstName,
    lastName,
    roleId: role._id,
    roleKey: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerifiedAt: new Date(),
  });

  logger.info({ email }, 'Super admin created (change password immediately)');
}

async function main() {
  await connectDatabase();
  await seedPermissions();
  await seedRoles();
  await seedSuperAdmin();
  await disconnectDatabase();
  logger.info('Auth seed complete');
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Auth seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
