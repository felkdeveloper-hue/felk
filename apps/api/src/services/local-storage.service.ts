import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '@/config/env.js';
import type {
  StorageObject,
  StorageObjectStream,
  StorageService,
  StorageUploadInput,
} from '@/services/interfaces/storage.service.js';

const LOCAL_MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

/**
 * Local disk storage — S3-ready interface implementation for catalog media.
 */
export class LocalStorageService implements StorageService {
  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  async upload(input: StorageUploadInput): Promise<StorageObject> {
    const fullPath = path.join(UPLOAD_ROOT, input.key);
    await this.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, input.body);

    const base =
      env.CDN_BASE_URL ||
      (env.API_PUBLIC_URL && !/localhost|127\.0\.0\.1/i.test(env.API_PUBLIC_URL)
        ? `${env.API_PUBLIC_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/uploads`
        : null) ||
      `/uploads`;

    return {
      key: input.key,
      url: `${base.replace(/\/$/, '')}/${input.key.replace(/\\/g, '/')}`,
      size: input.body.length,
      contentType: input.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(UPLOAD_ROOT, key);
    try {
      await fs.unlink(fullPath);
    } catch {
      // ignore missing files
    }
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    const base =
      env.CDN_BASE_URL ||
      (env.API_PUBLIC_URL && !/localhost|127\.0\.0\.1/i.test(env.API_PUBLIC_URL)
        ? `${env.API_PUBLIC_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/uploads`
        : null) ||
      `/uploads`;
    return `${base.replace(/\/$/, '')}/${key.replace(/\\/g, '/')}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(path.join(UPLOAD_ROOT, key));
      return true;
    } catch {
      return false;
    }
  }

  async getObject(key: string): Promise<StorageObjectStream | null> {
    const root = path.resolve(UPLOAD_ROOT) + path.sep;
    const fullPath = path.resolve(UPLOAD_ROOT, ...key.split('/').filter(Boolean));
    if (fullPath !== path.resolve(UPLOAD_ROOT) && !fullPath.startsWith(root)) {
      return null;
    }
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) return null;
      const ext = path.extname(fullPath).toLowerCase();
      return {
        body: createReadStream(fullPath),
        contentType: LOCAL_MIME[ext] ?? 'application/octet-stream',
        contentLength: stat.size,
      };
    } catch {
      return null;
    }
  }
}

export const localStorageService = new LocalStorageService();
