import mongoose from 'mongoose';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';

export type DatabaseStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
