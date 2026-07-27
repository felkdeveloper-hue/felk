/**
 * Extract and cache product-image ZIP archives for bulk import.
 *
 * Preview extracts once into a temp dir and stores a short-lived session so
 * import batches can resolve filenames without re-uploading a large ZIP.
 * Import may also accept a fresh ZIP and create a session on the fly.
 */
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import { openPromise, validateFileName } from 'yauzl';
import { ZipFile } from 'yazl';
import { ApiError } from '@/utils/errors/api-error';
import { logger } from '@/config';

export const IMPORT_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB expanded
const MAX_ENTRY_COUNT = 50_000;
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface ZipExtractResult {
  /** Lowercase basename → absolute extracted path */
  lookup: Map<string, string>;
  tempDir: string;
  imageCount: number;
  /** Non-fatal extract warnings (e.g. duplicate filenames) */
  issues: string[];
}

export interface ImportZipSession {
  id: string;
  lookup: Map<string, string>;
  tempDir: string;
  expiresAt: number;
  imageCount: number;
}

const sessions = new Map<string, ImportZipSession>();

function sweepSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(id);
      void rm(session.tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export function isSupportedImportImageFilename(filename: string): boolean {
  const base = path.basename(filename.trim());
  if (!base || base.includes('/') || base.includes('\\')) return false;
  return IMPORT_IMAGE_EXTENSIONS.has(path.extname(base).toLowerCase());
}

function shouldSkipZipEntry(entryName: string): boolean {
  const normalized = entryName.replace(/\\/g, '/');
  if (!normalized || normalized.endsWith('/')) return true;
  if (normalized.includes('__MACOSX/') || normalized.startsWith('__MACOSX')) return true;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..')) return true;
  const base = parts[parts.length - 1] ?? '';
  if (!base || base === '.DS_Store' || base.startsWith('._')) return true;
  return false;
}

/**
 * Stream-extract supported images from a ZIP into a temp directory.
 * Uses basenames for the lookup map (nested folders are flattened).
 */
export async function extractImportImagesZip(zipPath: string): Promise<ZipExtractResult> {
  const tempDir = path.join(os.tmpdir(), `felk-import-zip-${randomUUID()}`);
  await mkdir(tempDir, { recursive: true });

  const lookup = new Map<string, string>();
  const issues: string[] = [];
  let uncompressedTotal = 0;
  let imageCount = 0;
  let entryCount = 0;
  const tempRoot = path.resolve(tempDir);

  try {
    const zipfile = await openPromise(zipPath, {
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true,
    });

    for await (const entry of zipfile.eachEntry()) {
      entryCount += 1;
      if (entryCount > MAX_ENTRY_COUNT) {
        throw ApiError.badRequest(
          'ZIP contains too many files (limit 50,000).',
          undefined,
          'ZIP_TOO_MANY_FILES',
        );
      }

      const fileName = entry.fileName;
      const invalidReason = validateFileName(fileName);
      if (invalidReason) {
        throw ApiError.badRequest(
          `Unsafe path in ZIP rejected: ${fileName}`,
          undefined,
          'ZIP_SLIP',
        );
      }

      if (shouldSkipZipEntry(fileName)) continue;

      const normalized = fileName.replace(/\\/g, '/');
      if (normalized.includes('..')) {
        throw ApiError.badRequest(
          `Unsafe path in ZIP rejected: ${fileName}`,
          undefined,
          'ZIP_SLIP',
        );
      }

      const basename = path.basename(normalized);
      if (!IMPORT_IMAGE_EXTENSIONS.has(path.extname(basename).toLowerCase())) {
        continue;
      }

      uncompressedTotal += entry.uncompressedSize;
      if (uncompressedTotal > MAX_UNCOMPRESSED_BYTES) {
        throw ApiError.badRequest(
          'ZIP expands beyond the allowed size limit (2 GB uncompressed).',
          undefined,
          'ZIP_TOO_LARGE',
        );
      }

      const key = basename.toLowerCase();
      if (lookup.has(key)) {
        issues.push(`Duplicate filename "${basename}" in ZIP.`);
        continue;
      }

      const dest = path.resolve(tempDir, basename);
      if (dest !== tempRoot && !dest.startsWith(`${tempRoot}${path.sep}`)) {
        throw ApiError.badRequest(
          `Unsafe path in ZIP rejected: ${fileName}`,
          undefined,
          'ZIP_SLIP',
        );
      }

      const readStream = await zipfile.openReadStreamPromise(entry);
      await pipeline(readStream, createWriteStream(dest));
      lookup.set(key, dest);
      imageCount += 1;
    }

    zipfile.close();
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    if (error instanceof ApiError) throw error;
    logger.warn({ err: error, zipPath }, 'Failed to extract import images ZIP');
    throw ApiError.badRequest(
      error instanceof Error
        ? `Corrupted or unreadable ZIP: ${error.message}`
        : 'Corrupted or unreadable ZIP.',
      undefined,
      'ZIP_CORRUPT',
    );
  }

  return { lookup, tempDir, imageCount, issues };
}

export async function createImportZipSession(zipPath: string): Promise<{
  session: ImportZipSession;
  issues: string[];
}> {
  const extracted = await extractImportImagesZip(zipPath);
  sweepSessions();
  const session: ImportZipSession = {
    id: randomUUID(),
    lookup: extracted.lookup,
    tempDir: extracted.tempDir,
    expiresAt: Date.now() + SESSION_TTL_MS,
    imageCount: extracted.imageCount,
  };
  sessions.set(session.id, session);
  return { session, issues: extracted.issues };
}

export function getImportZipSession(id: string): ImportZipSession | null {
  sweepSessions();
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    void releaseImportZipSession(id);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

export async function releaseImportZipSession(id: string): Promise<void> {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  await rm(session.tempDir, { recursive: true, force: true }).catch(() => undefined);
}

/** Filenames shown in the admin dialog + used by the Excel/CSV sample rows. */
export const SAMPLE_IMPORT_IMAGE_FILES: Array<{
  name: string;
  color: [number, number, number];
  label: string;
}> = [
  { name: 'shirt-black-front.jpg', color: [28, 28, 28], label: 'BLACK FRONT' },
  { name: 'shirt-black-back.jpg', color: [48, 48, 48], label: 'BLACK BACK' },
  { name: 'shirt-white-front.jpg', color: [240, 240, 240], label: 'WHITE FRONT' },
  { name: 'hoodie-1.jpg', color: [35, 75, 140], label: 'HOODIE' },
];

/** Build a small sample images ZIP for the bulk-upload dialog download button. */
export async function buildSampleImagesZip(): Promise<Buffer> {
  const zipfile = new ZipFile();
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));

  const done = new Promise<Buffer>((resolve, reject) => {
    output.on('error', reject);
    output.on('end', () => resolve(Buffer.concat(chunks)));
  });

  zipfile.outputStream.pipe(output);

  for (const { name, color, label } of SAMPLE_IMPORT_IMAGE_FILES) {
    const [r, g, b] = color;
    const darkText = r + g + b > 400;
    const svg = `<svg width="600" height="750" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/>
  <text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="36" fill="${darkText ? '#222' : '#fff'}">${label}</text>
  <text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="20" fill="${darkText ? '#444' : '#ddd'}">${name}</text>
</svg>`;
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
    zipfile.addBuffer(jpeg, name);
  }

  zipfile.end();
  return done;
}
