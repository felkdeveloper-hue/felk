/**
 * Local seed: admin + customer accounts for development.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/seed-local-users.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { ROLE_SEED } from '@/constants/rbac-seed';
import { PERMISSION_LIST } from '@/constants/permissions';
import { ROLES } from '@/constants/roles';
import { USER_STATUS } from '@/constants/auth';
import { PermissionModel, RoleModel, UserModel } from '@/models';
import { hashPassword } from '@/utils/password.helper';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for local user seeding`);
  return value;
}

function getAccounts() {
  return [
    {
      email: requiredEnv('LOCAL_ADMIN_EMAIL'),
      password: requiredEnv('LOCAL_ADMIN_PASSWORD'),
      firstName: 'Admin',
      lastName: 'User',
      roleKey: ROLES.ADMIN,
    },
    {
      email: requiredEnv('LOCAL_CUSTOMER_EMAIL'),
      password: requiredEnv('LOCAL_CUSTOMER_PASSWORD'),
      firstName: 'Store',
      lastName: 'Customer',
      roleKey: ROLES.CUSTOMER,
    },
  ] as const;
}

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
}

async function upsertAccount(account: ReturnType<typeof getAccounts>[number]) {
  const role = await RoleModel.findOne({ key: account.roleKey });
  if (!role) {
    throw new Error(`Role missing: ${account.roleKey}`);
  }

  const passwordHash = await hashPassword(account.password);
  const email = account.email.toLowerCase();

  await UserModel.updateOne(
    { email },
    {
      $set: {
        email,
        passwordHash,
        passwordHistory: [],
        firstName: account.firstName,
        lastName: account.lastName,
        roleId: role._id,
        roleKey: account.roleKey,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    },
    { upsert: true },
  );

  logger.info({ email, roleKey: account.roleKey }, 'Account upserted');
}

async function main() {
  await connectDatabase();
  await seedPermissions();
  await seedRoles();
  for (const account of getAccounts()) {
    await upsertAccount(account);
  }
  await disconnectDatabase();
  logger.info('Local users seed complete');
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Local users seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
