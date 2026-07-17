/**
 * Runs before every test file is evaluated. Must NOT import app modules —
 * only sets process.env so `env.ts` parses test-safe values.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const uriFile = path.join(dir, '.mongo-uri');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.MORGAN_FORMAT = 'tiny';
process.env.RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.COD_WEBHOOK_SECRET = 'test-cod-webhook-secret';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-16chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-16chars!';
process.env.COOKIE_SECRET = 'test-cookie-secret-16chars!!!';
process.env.COOKIE_SECURE = 'false';

if (fs.existsSync(uriFile)) {
  process.env.MONGODB_URI = fs.readFileSync(uriFile, 'utf8').trim();
} else {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/fe-platform-test-fallback';
}
