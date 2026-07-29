import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import os from 'node:os';
import { appConfig } from '@/config/app.config.js';
import { ApiError } from '@/utils/errors/api-error.js';

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (!appConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(
      ApiError.badRequest(
        `File type ${file.mimetype} is not allowed`,
        undefined,
        'INVALID_FILE_TYPE',
      ),
    );
    return;
  }

  cb(null, true);
}

/**
 * Memory storage uploader — ready for Sharp processing / S3 upload later.
 */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: appConfig.upload.maxSizeBytes,
    files: 10,
  },
  fileFilter,
});

export function singleImageUpload(fieldName = 'file') {
  return memoryUpload.single(fieldName);
}

/**
 * Spreadsheet uploader for catalog imports. Browsers report inconsistent mime
 * types for .xlsx/.csv, so the extension is the authority here.
 */
const SPREADSHEET_EXTENSIONS = /\.(xlsx|xlsm|csv)$/i;

export const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!SPREADSHEET_EXTENSIONS.test(file.originalname ?? '')) {
      cb(
        ApiError.badRequest(
          'Upload an Excel (.xlsx) or CSV (.csv) file',
          undefined,
          'INVALID_FILE_TYPE',
        ),
      );
      return;
    }
    cb(null, true);
  },
});

export function singleSpreadsheetUpload(fieldName = 'file') {
  return spreadsheetUpload.single(fieldName);
}

/**
 * Bulk import uploader: required spreadsheet (`file`) + optional images ZIP
 * (`imagesZip`). Disk storage so ZIPs up to ~1 GB are not held in RAM.
 */
const IMPORT_ZIP_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
const IMPORT_SHEET_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function importUploadFilename(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, filename: string) => void,
) {
  const safe = (file.originalname ?? 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  cb(null, `felk-import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safe}`);
}

export const productImportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: importUploadFilename,
  }),
  limits: { fileSize: IMPORT_ZIP_MAX_BYTES, files: 2 },
  fileFilter(_req, file, cb) {
    if (file.fieldname === 'file') {
      if (!SPREADSHEET_EXTENSIONS.test(file.originalname ?? '')) {
        cb(
          ApiError.badRequest(
            'Upload an Excel (.xlsx) or CSV (.csv) file',
            undefined,
            'INVALID_FILE_TYPE',
          ),
        );
        return;
      }
      cb(null, true);
      return;
    }
    if (file.fieldname === 'imagesZip') {
      if (!/\.zip$/i.test(file.originalname ?? '')) {
        cb(
          ApiError.badRequest(
            'Upload a .zip file for product images',
            undefined,
            'INVALID_FILE_TYPE',
          ),
        );
        return;
      }
      cb(null, true);
      return;
    }
    cb(
      ApiError.badRequest(
        `Unexpected upload field "${file.fieldname}"`,
        undefined,
        'INVALID_FILE_TYPE',
      ),
    );
  },
});

export function productImportPreviewUpload() {
  return [
    productImportUpload.fields([
      { name: 'file', maxCount: 1 },
      { name: 'imagesZip', maxCount: 1 },
    ]),
    (req: Request, _res: unknown, next: (err?: unknown) => void) => {
      const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
      const sheet = files?.file?.[0];
      if (sheet && typeof sheet.size === 'number' && sheet.size > IMPORT_SHEET_MAX_BYTES) {
        next(
          ApiError.badRequest('Spreadsheet must be 10 MB or smaller', undefined, 'FILE_TOO_LARGE'),
        );
        return;
      }
      next();
    },
  ];
}

/** Optional ZIP on the import endpoint (products JSON may be JSON or form field). */
export const productImportZipOnlyUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: importUploadFilename,
  }),
  limits: { fileSize: IMPORT_ZIP_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (file.fieldname !== 'imagesZip' || !/\.zip$/i.test(file.originalname ?? '')) {
      cb(
        ApiError.badRequest(
          'Upload a .zip file for product images',
          undefined,
          'INVALID_FILE_TYPE',
        ),
      );
      return;
    }
    cb(null, true);
  },
});

export function multiImageUpload(fieldName = 'files', maxCount = 10) {
  return memoryUpload.array(fieldName, maxCount);
}
