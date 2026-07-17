import mongoose from 'mongoose';
import { ROLE_SEED } from '@/constants/rbac-seed';
import { PERMISSION_LIST } from '@/constants/permissions';
import { PermissionModel, RoleModel } from '@/models';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { initOrderPaymentConsumer } from '@/services/order-payment-consumer.service';

let rbacSeeded = false;
let consumerReady = false;

export async function setupTestDatabase() {
  await connectDatabase();
  if (!consumerReady) {
    initOrderPaymentConsumer();
    consumerReady = true;
  }
  if (!rbacSeeded) {
    await seedRbac();
    rbacSeeded = true;
  }
}

export async function teardownTestDatabase() {
  await disconnectDatabase();
}

export async function resetCollections() {
  const collections = mongoose.connection.collections;
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({});
  }
  rbacSeeded = false;
  await seedRbac();
  rbacSeeded = true;
}

async function seedRbac() {
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

export async function waitFor<T>(
  fn: () => Promise<T | null | undefined | false>,
  opts: { timeoutMs?: number; intervalMs?: number; label?: string } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const intervalMs = opts.intervalMs ?? 100;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitFor timed out${opts.label ? `: ${opts.label}` : ''}`);
}
