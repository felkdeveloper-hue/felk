import dns from 'node:dns';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';

export type DatabaseStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const resolveSrv = promisify(dns.resolveSrv);
const resolveTxt = promisify(dns.resolveTxt);

/**
 * Node on Windows often hits `querySrv ETIMEOUT` for mongodb+srv while system DNS works.
 * Prefer public resolvers before Atlas SRV lookups.
 */
function configureMongoDns(): void {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // ignore — some environments lock DNS settings
  }
}

/**
 * Expand mongodb+srv:// to a standard mongodb:// multi-host URI.
 * Avoids the Node driver's internal querySrv path that frequently times out on Windows.
 */
async function expandSrvConnectionString(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) return uri;

  configureMongoDns();
  const parsed = new URL(uri);
  const hostname = parsed.hostname;
  const auth =
    parsed.username || parsed.password
      ? `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}@`
      : '';
  const dbName = parsed.pathname.replace(/^\//, '') || 'fe-platform';

  const [srvRecords, txtRecords] = await Promise.all([
    resolveSrv(`_mongodb._tcp.${hostname}`),
    resolveTxt(hostname).catch(() => [] as string[][]),
  ]);

  if (!srvRecords.length) {
    throw new Error(`No SRV records found for ${hostname}`);
  }

  const txt = txtRecords.map((parts) => parts.join('')).join('');
  const atlasParams = new URLSearchParams(txt);
  const query = new URLSearchParams(parsed.search);
  if (!query.has('ssl') && !query.has('tls')) query.set('tls', 'true');
  if (!query.has('authSource') && atlasParams.get('authSource')) {
    query.set('authSource', atlasParams.get('authSource')!);
  }
  if (!query.has('replicaSet') && atlasParams.get('replicaSet')) {
    query.set('replicaSet', atlasParams.get('replicaSet')!);
  }
  if (!query.has('retryWrites')) query.set('retryWrites', 'true');
  if (!query.has('w')) query.set('w', 'majority');

  const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');
  const expanded = `mongodb://${auth}${hosts}/${dbName}?${query.toString()}`;
  logger.info(
    { hostCount: srvRecords.length, replicaSet: query.get('replicaSet') },
    'Expanded mongodb+srv URI to standard hosts (Windows DNS workaround)',
  );
  return expanded;
}

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

  const { ProductVariantModel } = await import('@/models/product.models.js');
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

  const { VerificationTokenModel, PasswordResetTokenModel } = await import('@/models/index.js');
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
    configureMongoDns();
    mongoose.set('strictQuery', true);
    // Prefer immediate failures over 10s "buffering timed out" when disconnected.
    mongoose.set('bufferCommands', true);

    try {
      let uri = appConfig.database.uri;
      try {
        uri = await expandSrvConnectionString(uri);
      } catch (expandError) {
        logger.warn(
          { err: expandError },
          'Could not expand mongodb+srv URI — falling back to driver SRV resolution',
        );
      }

      const connection = await mongoose.connect(uri, {
        maxPoolSize: appConfig.database.maxPoolSize,
        // Atlas SRV + cold clusters need more than the previous 10s window.
        serverSelectionTimeoutMS: 30_000,
        connectTimeoutMS: 30_000,
        socketTimeoutMS: 45_000,
        family: 4,
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

      // A URI with no path segment silently resolves to the "test" database,
      // which reads as an empty-but-healthy catalog rather than a failure.
      if (connection.connection.name === 'test') {
        logger.warn(
          'MONGODB_URI has no database name — falling back to "test". Append /fe-platform to the URI.',
        );
      }

      await repairVariantBarcodeIndex().catch((error: unknown) => {
        logger.warn({ err: error }, 'Variant barcode index repair skipped');
      });

      await repairOtpTokenIndexes().catch((error: unknown) => {
        logger.warn({ err: error }, 'OTP token index repair skipped');
      });

      await repairUserEmailIndex().catch((error: unknown) => {
        logger.warn({ err: error }, 'User email index repair skipped');
      });

      // One-time rate bump: standard flat shipping 400 → 500 LKR.
      void import('@/models/settings.models.js')
        .then(({ ShippingZoneModel }) =>
          ShippingZoneModel.updateMany(
            { rate: 400, rateType: 'flat', isDeleted: false },
            { $set: { rate: 500 } },
          ),
        )
        .then((result) => {
          if (result.modifiedCount > 0) {
            logger.info(
              { modifiedCount: result.modifiedCount },
              'Updated flat shipping zones from LKR 400 to LKR 500',
            );
          }
        })
        .catch((error: unknown) => {
          logger.warn({ err: error }, 'Shipping zone rate update skipped');
        });

      return connection;
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));
      // Stop queueing queries that will never resolve while we are offline.
      mongoose.set('bufferCommands', false);
      logger.error({ err: this.lastError }, 'MongoDB connection failed');
      throw this.lastError;
    }
  }

  /** Background retries after degraded boot (e.g. transient DNS / Atlas blip). */
  startReconnectLoop(intervalMs = 15_000, onConnected?: () => void): void {
    let signaled = false;
    const tick = async () => {
      if (this.isConnected() || this.status === 'connecting') return;
      try {
        logger.info('Retrying MongoDB connection…');
        await this.connect();
        if (!signaled) {
          signaled = true;
          onConnected?.();
        }
      } catch {
        // logged in connect()
      }
    };
    setInterval(() => {
      void tick();
    }, intervalMs).unref();
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
