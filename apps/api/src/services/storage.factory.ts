import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { LocalStorageService } from '@/services/local-storage.service.js';
import { S3StorageService } from '@/services/s3-storage.service.js';
import type { StorageService } from '@/services/interfaces/storage.service.js';

function createStorageService(): StorageService {
  const { provider } = appConfig.storage;

  if (provider === 'r2' || provider === 's3') {
    if (!appConfig.storage.publicUrl) {
      logger.warn(
        'Object storage public URL is not set — set R2_PUBLIC_URL or CDN_BASE_URL for uploaded file URLs',
      );
    }
    logger.info({ provider, bucket: appConfig.storage.bucket }, 'Using object storage');
    return new S3StorageService();
  }

  logger.info('Using local disk storage');
  return new LocalStorageService();
}

export const storageService = createStorageService();
