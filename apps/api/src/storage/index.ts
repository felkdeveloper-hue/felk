import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';

export { storageService } from '@/services/storage.factory.js';
export type {
  StorageObject,
  StorageService,
  StorageUploadInput,
} from '@/services/interfaces/storage.service.js';

/** Alias used by scripts / callers that prefer a function form. */
export { storageService as getStorageService } from '@/services/storage.factory.js';

export function logStorageBackend(): void {
  const { provider, bucket, publicUrl } = appConfig.storage;

  if (provider === 'r2') {
    logger.info(
      {
        backend: provider,
        bucket,
        hasPublicUrl: Boolean(publicUrl),
      },
      publicUrl
        ? 'Media storage: Cloudflare R2'
        : 'Media storage: Cloudflare R2 (uploads enabled, but R2_PUBLIC_URL is missing — images will not display until set)',
    );
    return;
  }

  if (provider === 's3') {
    logger.info({ backend: provider, bucket }, 'Media storage: AWS S3');
    return;
  }

  logger.info({ backend: provider }, 'Media storage: local disk (development)');
}
