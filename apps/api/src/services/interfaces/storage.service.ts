/**
 * Object storage contract (local / S3 / R2) — interface only.
 */
export interface StorageUploadInput {
  key: string;
  body: Buffer;
  contentType: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

export interface StorageObject {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
}

export interface StorageService {
  upload(input: StorageUploadInput): Promise<StorageObject>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
}
