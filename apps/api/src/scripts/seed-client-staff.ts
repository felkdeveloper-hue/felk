/**
 * Seed client staff accounts (Gangesh, Reggie, Esther) as sub-admins.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api seed:client-staff
 *
 * Optional env:
 *   CLIENT_STAFF_PASSWORD  (default ClientAccess!234)
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config/index.js';
import { ROLE_SEED } from '@/constants/rbac-seed.js';
import { PERMISSION_LIST } from '@/constants/permissions.js';
import { ROLES } from '@/constants/roles.js';
import { USER_STATUS } from '@/constants/auth.js';
import { PermissionModel, RoleModel, UserModel } from '@/models/index.js';
import { hashPassword } from '@/utils/password.helper.js';

const STAFF = [
  { firstName: 'Gangesh', lastName: '-', email: 'gangesh@fe.lk' },
  { firstName: 'Reggie', lastName: '-', email: 'reggie@fe.lk' },
  { firstName: 'Esther', lastName: '-', email: 'esther@fe.lk' },
] as const;

async function seedPermissionsAndRoles() {
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

async function upsertStaffUser(
  input: { firstName: string; lastName: string; email: string },
  passwordHash: string,
  roleId: unknown,
) {
  const email = input.email.toLowerCase();
  const existing = await UserModel.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.firstName = input.firstName;
    existing.lastName = input.lastName;
    existing.roleId = roleId as never;
    existing.roleKey = ROLES.SUB_ADMIN;
    existing.status = USER_STATUS.ACTIVE;
    existing.emailVerifiedAt = existing.emailVerifiedAt ?? new Date();
    existing.isDeleted = false;
    existing.deletedAt = null;
    await existing.save();
    logger.info({ email }, 'Client staff updated');
    return;
  }

  await UserModel.create({
    email,
    passwordHash,
    passwordHistory: [],
    firstName: input.firstName,
    lastName: input.lastName,
    roleId,
    roleKey: ROLES.SUB_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerifiedAt: new Date(),
  });
  logger.info({ email }, 'Client staff created');
}

async function main() {
  const password = process.env.CLIENT_STAFF_PASSWORD ?? 'ClientAccess!234';
  await connectDatabase();
  await seedPermissionsAndRoles();

  const role = await RoleModel.findOne({ key: ROLES.SUB_ADMIN });
  if (!role) {
    throw new Error('sub_admin role missing after seed');
  }

  const passwordHash = await hashPassword(password);
  for (const person of STAFF) {
    await upsertStaffUser(person, passwordHash, role._id);
  }

  await disconnectDatabase();
  logger.info(
    {
      password,
      accounts: STAFF.map((s) => s.email),
      role: ROLES.SUB_ADMIN,
    },
    'Client staff seed complete — share credentials with the client and ask them to change passwords',
  );
}

main().catch(async (error) => {
  logger.error({ err: error }, 'Client staff seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
