import Redis from 'ioredis';
import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';

export type RedisStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class RedisManager {
  private client: Redis | null = null;
  private status: RedisStatus = 'disconnected';
  private lastError: Error | null = null;

  getStatus(): RedisStatus {
    return this.status;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(appConfig.redis.url, {
        keyPrefix: appConfig.redis.keyPrefix,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy(times) {
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.status = 'connecting';
      });

      this.client.on('ready', () => {
        this.status = 'connected';
        this.lastError = null;
        logger.info('Redis ready');
      });

      this.client.on('error', (error: Error) => {
        this.status = 'error';
        this.lastError = error;
        logger.error({ err: error }, 'Redis error');
      });

      this.client.on('close', () => {
        this.status = 'disconnected';
      });
    }

    return this.client;
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.client?.status === 'ready';
  }

  async connect(): Promise<Redis> {
    const client = this.getClient();

    if (client.status === 'wait' || client.status === 'end') {
      this.status = 'connecting';
      await client.connect();
    }

    this.status = 'connected';
    logger.info('Redis connected');
    return client;
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      this.status = 'disconnected';
      return;
    }

    await this.client.quit();
    this.client = null;
    this.status = 'disconnected';
    logger.info('Redis disconnected cleanly');
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; status: RedisStatus }> {
    const start = Date.now();

    if (!this.client || this.client.status !== 'ready') {
      return { ok: false, latencyMs: 0, status: this.status };
    }

    try {
      const pong = await this.client.ping();
      return {
        ok: pong === 'PONG',
        latencyMs: Date.now() - start,
        status: this.status,
      };
    } catch (error) {
      this.status = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return { ok: false, latencyMs: Date.now() - start, status: this.status };
    }
  }
}

export const redisManager = new RedisManager();

export function getRedisClient(): Redis {
  return redisManager.getClient();
}

export async function connectRedis(): Promise<Redis> {
  return redisManager.connect();
}

export async function disconnectRedis(): Promise<void> {
  return redisManager.disconnect();
}
