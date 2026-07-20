import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ApiError } from '@/utils/errors/api-error';
import type {
  StorageObject,
  StorageService,
  StorageUploadInput,
} from '@/services/interfaces/storage.service';

export interface S3StorageOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
  endpoint?: string;
}

/**
 * S3-compatible object storage (AWS S3 or Cloudflare R2).
 */
export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.publicUrlBase = options.publicUrl?.replace(/\/$/, '') ?? '';
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  private objectUrl(key: string): string {
    if (!this.publicUrlBase) {
      throw ApiError.badRequest(
        'R2_PUBLIC_URL or CDN_BASE_URL is not configured. Enable public access on your R2 bucket in Cloudflare and set the public URL in your API environment variables.',
        undefined,
        'STORAGE_PUBLIC_URL_MISSING',
      );
    }
    return `${this.publicUrlBase}/${key.replace(/\\/g, '/')}`;
  }

  async upload(input: StorageUploadInput): Promise<StorageObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        Metadata: input.metadata,
      }),
    );

    return {
      key: input.key,
      url: this.objectUrl(input.key),
      size: input.body.length,
      contentType: input.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.objectUrl(key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
