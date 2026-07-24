import mongoose from 'mongoose';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';

export type DatabaseStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Drop legacy unique barcode index that rejects multiple null barcodes. */
async function repairVariantBarcodeIndex() {
  const db = mongoose.connection.db;
  if (!db) return;

  const collection = db.collection('product_variants');
  const indexes = await collection.indexes();
  const barcodeIndexes = indexes.filter(
    (index) =>
      index.name === 'barcode_1' ||
      (index.key && (index.key as { barcode?: number }).barcode === 1),
  );

  for (const index of barcodeIndexes) {
    if (!index.name || index.name === '_id_') continue;
    // Keep a correct partial unique index; drop everything else on barcode.
    const isPartialStringUnique =
      Boolean(index.unique) &&
      Boolean(index.partialFilterExpression) &&
      JSON.stringify(index.partialFilterExpression).includes('$type');
    if (isPartialStringUnique) continue;
    await collection.dropIndex(index.name);
    logger.info({ index: index.name }, 'Dropped legacy product_variants barcode index');
  }

  const unsetResult = await collection.updateMany(
    { $or: [{ barcode: null }, { barcode: '' }] },
    { $unset: { barcode: '' } },
  );
  if (unsetResult.modifiedCount > 0) {
    logger.info({ count: unsetResult.modifiedCount }, 'Cleared null/empty variant barcodes');
  }

  const { ProductVariantModel } = await import('@/models/product.models');
  await ProductVariantModel.syncIndexes();
}

/**
 * Drop legacy unique `tokenHash` indexes on the OTP-based verification /
 * password-reset collections. These fields were replaced by `codeHash`
 * (which is not unique — short numeric codes can collide across users), but
 * MongoDB keeps the old unique index until it's explicitly dropped, which
 * rejects every second document with `tokenHash: null`.
 */
async function repairOtpTokenIndexes() {
  const db = mongoose.connection.db;
  if (!db) return;

  for (const collectionName of ['verification_tokens', 'password_reset_tokens']) {
    const collection = db.collection(collectionName);
    const indexes = await collection.indexes().catch(() => []);
    const staleIndexes = indexes.filter(
      (index) => index.unique && (index.key as { tokenHash?: number }).tokenHash === 1,
    );

    for (const index of staleIndexes) {
      if (!index.name) continue;
      await collection.dropIndex(index.name);
      logger.info(
        { collection: collectionName, index: index.name },
        'Dropped legacy tokenHash index',
      );
    }
  }

  const { VerificationTokenModel, PasswordResetTokenModel } = await import('@/models');
  await VerificationTokenModel.syncIndexes();
  await PasswordResetTokenModel.syncIndexes();
}

/** Replace global unique email index with partial index (allows re-register after soft delete). */
async function repairUserEmailIndex() {
  const db = mongoose.connection.db;
  if (!db) return;

  const collection = db.collection('users');
  const indexes = await collection.indexes().catch(() => []);
  const emailIndexes = indexes.filter(
    (index) => index.key && (index.key as { email?: number }).email === 1,
  );

  for (const index of emailIndexes) {
    if (!index.name || index.name === '_id_') continue;
    const isPartialActiveUnique =
      Boolean(index.unique) &&
      Boolean(index.partialFilterExpression) &&
      JSON.stringify(index.partialFilterExpression).includes('isDeleted');
    if (isPartialActiveUnique) continue;
    await collection.dropIndex(index.name);
    logger.info({ index: index.name }, 'Dropped legacy users email index');
  }

  await collection.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: { isDeleted: false },
      name: 'email_1',
    },
  );
}

class DatabaseManager {
  private status: DatabaseStatus = 'disconnected';
  private lastError: Error | null = null;

  getStatus(): DatabaseStatus {
    return this.status;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  isConnected(): boolean {
    return this.status === 'connected' && mongoose.connection.readyState === 1;
  }

  async connect(): Promise<typeof mongoose> {
    if (this.isConnected()) {
      return mongoose;
    }

    this.status = 'connecting';
    mongoose.set('strictQuery', true);

    try {
      const connection = await mongoose.connect(appConfig.database.uri, {
        maxPoolSize: appConfig.database.maxPoolSize,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
      });

      this.status = 'connected';
      this.lastError = null;

      mongoose.connection.on('disconnected', () => {
        this.status = 'disconnected';
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        this.status = 'connected';
        logger.info('MongoDB reconnected');
      });

      mongoose.connection.on('error', (error: Error) => {
        this.status = 'error';
        this.lastError = error;
        logger.error({ err: error }, 'MongoDB connection error');
      });

      logger.info(
        { host: connection.connection.host, name: connection.connection.name },
        'MongoDB connected',
      );

      await repairVariantBarcodeIndex().catch((error: unknown) => {
        logger.warn({ err: error }, 'Variant barcode index repair skipped');
      });

      await repairOtpTokenIndexes().catch((error: unknown) => {
        logger.warn({ err: error }, 'OTP token index repair skipped');
      });

      await repairUserEmailIndex().catch((error: unknown) => {
        logger.warn({ err: error }, 'User email index repair skipped');
      });

      return connection;
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error({ err: this.lastError }, 'MongoDB connection failed');
      throw this.lastError;
    }
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      this.status = 'disconnected';
      return;
    }

    await mongoose.disconnect();
    this.status = 'disconnected';
    logger.info('MongoDB disconnected cleanly');
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; status: DatabaseStatus }> {
    const start = Date.now();

    if (!this.isConnected()) {
      return { ok: false, latencyMs: 0, status: this.status };
    }

    try {
      await mongoose.connection.db?.admin().ping();
      return { ok: true, latencyMs: Date.now() - start, status: this.status };
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return { ok: false, latencyMs: Date.now() - start, status: this.status };
    }
  }
}

export const databaseManager = new DatabaseManager();

export async function connectDatabase(): Promise<typeof mongoose> {
  return databaseManager.connect();
}

export async function disconnectDatabase(): Promise<void> {
  return databaseManager.disconnect();
}
