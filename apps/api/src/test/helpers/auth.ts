import type { Application } from 'express';
import request from 'supertest';
import { USER_STATUS } from '@/constants/auth';
import { ROLES } from '@/constants/roles';
import { RoleModel, UserModel } from '@/models';
import { hashPassword } from '@/utils/password.helper';

const API = '/api/v1';
export const TEST_PASSWORD = 'TestPass1!';

export async function registerCustomer(
  app: Application,
  overrides: Partial<{ email: string; firstName: string; lastName: string }> = {},
) {
  // Local-part must vary in the first 8 alphanumerics — referral codes are
  // derived from email.slice(0,8) and collide if every user is `customer_…`.
  const email =
    overrides.email ??
    `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@test.com`;
  const res = await request(app)
    .post(`${API}/auth/register`)
    .send({
      email,
      password: TEST_PASSWORD,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'Customer',
    });

  if (res.status >= 400) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  // Ensure customer can authenticate immediately in tests.
  await UserModel.updateOne(
    { email },
    { $set: { status: USER_STATUS.ACTIVE, emailVerifiedAt: new Date() } },
  );

  return login(app, email, TEST_PASSWORD);
}

export async function login(
  app: Application,
  email: string,
  password = TEST_PASSWORD,
  portal: 'customer' | 'admin' = 'customer',
) {
  const res = await request(app).post(`${API}/auth/login`).send({ email, password, portal });
  if (res.status >= 400) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const accessToken =
    (res.body?.data?.accessToken as string | undefined) ?? extractCookie(res, 'fe_access_token');
  const refreshToken =
    (res.body?.data?.refreshToken as string | undefined) ?? extractCookie(res, 'fe_refresh_token');
  if (!accessToken) {
    throw new Error(`login missing access token: ${JSON.stringify(res.body)}`);
  }
  return {
    email,
    accessToken,
    refreshToken,
    user: res.body?.data?.user as Record<string, unknown> | undefined,
    auth: { Authorization: `Bearer ${accessToken}` },
  };
}

export async function createAdminUser(app: Application) {
  const role = await RoleModel.findOne({ key: ROLES.SUPER_ADMIN });
  if (!role) throw new Error('SUPER_ADMIN role missing — seed RBAC first');
  const email = `admin_${Date.now()}@test.com`;
  await UserModel.create({
    email,
    passwordHash: await hashPassword(TEST_PASSWORD),
    passwordHistory: [],
    firstName: 'Admin',
    lastName: 'Tester',
    roleId: role._id,
    roleKey: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerifiedAt: new Date(),
  });
  return login(app, email, TEST_PASSWORD, 'admin');
}

function extractCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const c of cookies) {
    const match = c.match(new RegExp(`(?:^|)${name}=([^;]+)`));
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return undefined;
}
