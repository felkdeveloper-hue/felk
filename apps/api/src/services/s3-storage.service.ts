import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { appConfig } from '@/config/app.config';
import type {
  StorageObject,
  StorageService,
  StorageUploadInput,
} from '@/services/interfaces/storage.service';

function normalizeKey(key: string): string {
  return key.replace(/\\/g, '/').replace(/^\/+/, '');
}

function publicObjectUrl(key: string): string {
  const base = appConfig.storage.publicUrl;
  if (!base) {
    throw new Error(
      'Object storage public URL is not configured. Set R2_PUBLIC_URL or CDN_BASE_URL.',
    );
  }
  return `${base.replace(/\/$/, '')}/${normalizeKey(key)}`;
}

/**
 * S3-compatible object storage — works with AWS S3 and Cloudflare R2.
 */
export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const { provider, region, accessKeyId, secretAccessKey, bucket, endpoint } = appConfig.storage;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(`${provider} storage is missing bucket or credentials`);
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region: region ?? 'auto',
      endpoint,
      forcePathStyle: provider === 'r2',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(input: StorageUploadInput): Promise<StorageObject> {
    const key = normalizeKey(input.key);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
        CacheControl: input.isPublic === false ? undefined : 'public, max-age=31536000, immutable',
      }),
    );

    return {
      key,
      url: publicObjectUrl(key),
      size: input.body.length,
      contentType: input.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizeKey(key),
      }),
    );
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (appConfig.storage.publicUrl) {
      return publicObjectUrl(key);
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalizeKey(key),
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: normalizeKey(key),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
