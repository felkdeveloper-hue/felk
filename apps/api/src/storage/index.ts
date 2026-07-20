import { appConfig } from '@/config/app.config';
import { logger } from '@/config/logger';
import { localStorageService } from '@/services/local-storage.service';
import { S3StorageService } from '@/services/s3-storage.service';
import type { StorageService } from '@/services/interfaces/storage.service';

let cachedStorage: StorageService | null = null;

export type StorageBackend = 'r2' | 's3' | 'local';

export function getStorageBackend(): StorageBackend {
  const { r2, s3 } = appConfig.storage;
  if (r2.enabled) return 'r2';
  if (s3.enabled) return 's3';
  return 'local';
}

export function logStorageBackend(): void {
  const backend = getStorageBackend();
  const { r2 } = appConfig.storage;

  if (backend === 'r2') {
    logger.info(
      {
        backend,
        bucket: r2.bucket,
        hasPublicUrl: Boolean(r2.publicUrl),
      },
      r2.publicUrl
        ? 'Media storage: Cloudflare R2'
        : 'Media storage: Cloudflare R2 (uploads enabled, but R2_PUBLIC_URL is missing — images will not display until set)',
    );
    return;
  }

  if (backend === 's3') {
    logger.info({ backend }, 'Media storage: AWS S3');
    return;
  }

  logger.info({ backend }, 'Media storage: local disk (development)');
}

/**
 * Resolves the active storage adapter:
 * - Cloudflare R2 when R2 credentials are configured
 * - AWS S3 when S3 credentials are configured
 * - Local disk otherwise (development)
 */
export function getStorageService(): StorageService {
  if (cachedStorage) return cachedStorage;

  const { r2, s3 } = appConfig.storage;

  if (r2.enabled) {
    cachedStorage = new S3StorageService({
      region: 'auto',
      endpoint: r2.endpoint,
      accessKeyId: r2.accessKeyId!,
      secretAccessKey: r2.secretAccessKey!,
      bucket: r2.bucket!,
      publicUrl: r2.publicUrl,
    });
    return cachedStorage;
  }

  if (s3.enabled) {
    cachedStorage = new S3StorageService({
      region: s3.region ?? 'us-east-1',
      endpoint: s3.endpoint,
      accessKeyId: s3.accessKeyId!,
      secretAccessKey: s3.secretAccessKey!,
      bucket: s3.bucket!,
      publicUrl: s3.publicUrl!,
    });
    return cachedStorage;
  }

  cachedStorage = localStorageService;
  return cachedStorage;
}

/** @internal Resets cached adapter (tests only). */
export function resetStorageServiceForTests(): void {
  cachedStorage = null;
}
