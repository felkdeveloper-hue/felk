import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { appConfig } from '@/config/app.config';
import { ApiError } from '@/utils/errors/api-error';

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

export function multiImageUpload(fieldName = 'files', maxCount = 10) {
  return memoryUpload.array(fieldName, maxCount);
}
