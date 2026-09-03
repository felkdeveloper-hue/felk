import { Router, type NextFunction, type Request, type Response } from 'express';
import { storageService } from '@/services/storage.factory.js';
import { sanitizeStorageKey } from '@/utils/public-media-url.js';

/**
 * First-party image proxy for R2 objects.
 * Mounted outside the rate limiter so a product grid cannot 429 the photos.
 */
export const mediaRouter = Router();

async function sendStoredObject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    const key = sanitizeStorageKey(req.path);
    if (!key) {
      res.status(404).end();
      return;
    }

    const object = await storageService.getObject(key);
    if (!object) {
      res.status(404).end();
      return;
    }

    res.setHeader('Content-Type', object.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', object.cacheControl ?? 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (object.contentLength != null) {
      res.setHeader('Content-Length', String(object.contentLength));
    }
    if (object.etag) {
      res.setHeader('ETag', object.etag);
    }

    if (req.method === 'HEAD') {
      object.body.destroy();
      res.status(200).end();
      return;
    }

    object.body.pipe(res);
  } catch (error) {
    next(error);
  }
}

mediaRouter.use(sendStoredObject);
