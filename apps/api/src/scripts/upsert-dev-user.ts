/**
 * One-off: restore a dev customer account.
 * Usage: npx tsx src/scripts/upsert-dev-user.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { ROLE_SEED } from '@/constants/rbac-seed';
import { PERMISSION_LIST } from '@/constants/permissions';
import { ROLES } from '@/constants/roles';
import { USER_STATUS } from '@/constants/auth';
import { CustomerModel, PermissionModel, RoleModel, UserModel } from '@/models';
import { hashPassword } from '@/utils/password.helper';

const EMAIL = process.env.DEV_USER_EMAIL ?? 'sourav@gluckglobal.com';
const PASSWORD = process.env.DEV_USER_PASSWORD ?? 'Test@123';
const FIRST_NAME = process.env.DEV_USER_FIRST_NAME ?? 'Sourav';
const LAST_NAME = process.env.DEV_USER_LAST_NAME ?? 'User';

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

async function main() {
  await connectDatabase();
  await seedPermissions();
  await seedRoles();

  const role = await RoleModel.findOne({ key: ROLES.CUSTOMER });
  if (!role) throw new Error('Customer role missing');

  const email = EMAIL.toLowerCase();
  const passwordHash = await hashPassword(PASSWORD);

  const user = await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        passwordHash,
        passwordHistory: [],
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        roleId: role._id,
        roleKey: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
        isDeleted: false,
        deletedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    },
    { upsert: true, new: true },
  );

  await CustomerModel.updateOne(
    { userId: user._id },
    {
      $set: {
        userId: user._id,
        email,
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        status: 'active',
        isDeleted: false,
        deletedAt: null,
      },
    },
    { upsert: true },
  );

  logger.info({ email, firstName: FIRST_NAME }, 'Dev customer account ready');
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Dev user upsert failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
