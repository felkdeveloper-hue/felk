import { promises as fs } from 'node:fs';
import path from 'node:path';
import { appConfig } from '@/config/app.config';
import type {
  StorageObject,
  StorageService,
  StorageUploadInput,
} from '@/services/interfaces/storage.service';

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

    const base = appConfig.storage.publicUrl || `http://localhost:${appConfig.server.port}/uploads`;

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
    const base = appConfig.storage.publicUrl || `http://localhost:${appConfig.server.port}/uploads`;
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
}

export const localStorageService = new LocalStorageService();
