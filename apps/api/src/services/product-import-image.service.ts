/**
 * Download-then-upload helper for bulk import image URLs.
 *
 * Attempts to fetch each URL, process it through sharp (same pipeline as
 * uploadImage), and store it in the configured storage adapter (R2 / S3 /
 * local).  On any failure it logs a warning and falls back to
 * `createRemote` so the import never fails because of a bad image URL.
 *
 * ZIP filenames are uploaded to R2 first (see uploadImportZipImage) so the
 * existing URL-based attach path can stay unchanged.
 */
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import http from 'node:http';
import path from 'node:path';
import { ProductMediaModel } from '@/models/product.models.js';
import { storageService } from '@/services/storage.factory.js';
import { getImageMetadata, processImage } from '@/utils/image.helper.js';
import { logger } from '@/config/index.js';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

/**
 * Upload a local ZIP-extracted image to object storage and return its public URL.
 * Path: products/{productHandle}/{uuid}.{ext}
 */
export async function uploadImportZipImage(
  localPath: string,
  productHandle: string,
): Promise<string> {
  const buffer = await readFile(localPath);
  const ext = path.extname(localPath).toLowerCase().replace('.', '') || 'jpg';
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const id = randomUUID();
  const safeHandle =
    productHandle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'product';
  const key = `products/${safeHandle}/${id}.${ext}`;
  const stored = await storageService.upload({
    key,
    body: buffer,
    contentType,
    isPublic: true,
  });
  return stored.url;
}

interface AttachOptions {
  productId: string;
  variantId: string;
  altText: string;
  urls: string[];
  /** Priority base (multiplied by index). */
  priorityBase?: number;
  /** Whether the very first image in this call should be the product primary. */
  setPrimary?: boolean;
}

/**
 * Fetch a URL into a Buffer via native https/http (no extra dep).
 * Follows one redirect. Throws on non-2xx.
 */
function fetchBuffer(url: string, timeoutMs = 20_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res: IncomingMessage) => {
      // Follow a single redirect
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuffer(res.headers.location, timeoutMs).then(resolve, reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode ?? 'unknown'} from ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timed out after ${timeoutMs}ms: ${url}`));
    });
  });
}

/**
 * Attach images from a list of URLs to a variant.
 * Downloads each URL to storage; falls back to createRemote on failure.
 * Returns the number of images successfully processed.
 */
export async function attachImportImages(options: AttachOptions): Promise<number> {
  const { productId, variantId, altText, urls, priorityBase = 0, setPrimary = false } = options;
  if (!urls.length) return 0;

  let attached = 0;

  for (const [index, url] of urls.entries()) {
    const priority = priorityBase + index;
    const isPrimary = setPrimary && index === 0;

    try {
      // Download
      const rawBuffer = await fetchBuffer(url);

      // Process through sharp (same as uploadImage)
      const [webp, thumb] = await Promise.all([
        processImage(rawBuffer, { width: 1600, quality: 82, format: 'webp' }),
        processImage(rawBuffer, { width: 400, quality: 75, format: 'webp' }),
      ]);
      const metadata = await getImageMetadata(webp);
      const id = randomUUID();
      const key = `products/${productId}/images/${id}.webp`;
      const thumbKey = `products/${productId}/images/${id}-thumb.webp`;

      const [stored, storedThumb] = await Promise.all([
        storageService.upload({ key, body: webp, contentType: 'image/webp', isPublic: true }),
        storageService.upload({
          key: thumbKey,
          body: thumb,
          contentType: 'image/webp',
          isPublic: true,
        }),
      ]);

      if (isPrimary) {
        await ProductMediaModel.updateMany(
          { productId, isDeleted: false },
          { $set: { isPrimary: false } },
        );
      }

      await ProductMediaModel.create({
        productId,
        variantId,
        type: 'image',
        url: stored.url,
        key,
        thumbnailUrl: storedThumb.url,
        alt: altText,
        mimeType: 'image/webp',
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        sizeBytes: webp.length,
        priority,
        isPrimary,
        isThumbnail: isPrimary,
        isGallery: true,
        isDeleted: false,
      });
      attached += 1;
    } catch (downloadError) {
      logger.warn(
        { url, productId, variantId, error: String(downloadError) },
        'Image download failed — falling back to remote URL',
      );
      // Fallback: store as remote reference
      try {
        if (isPrimary) {
          await ProductMediaModel.updateMany(
            { productId, isDeleted: false },
            { $set: { isPrimary: false } },
          );
        }
        await ProductMediaModel.create({
          productId,
          variantId,
          type: 'image',
          url,
          key: null,
          thumbnailUrl: null,
          alt: altText,
          mimeType: null,
          width: null,
          height: null,
          sizeBytes: null,
          priority,
          isPrimary,
          isThumbnail: isPrimary,
          isGallery: true,
          isDeleted: false,
        });
        attached += 1;
      } catch (fallbackError) {
        logger.warn(
          { url, productId, variantId, error: String(fallbackError) },
          'Remote fallback also failed — skipping image',
        );
      }
    }
  }

  return attached;
}
