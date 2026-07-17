#!/usr/bin/env node
/**
 * Bootstrap helper — copy .env.example files if missing.
 * Usage: node scripts/setup-env.mjs
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const pairs = [
  ['.env.example', '.env'],
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env'],
  ['apps/admin/.env.example', 'apps/admin/.env'],
];

for (const [src, dest] of pairs) {
  const from = join(root, src);
  const to = join(root, dest);

  if (!existsSync(from)) {
    console.warn(`skip: missing ${src}`);
    continue;
  }

  if (existsSync(to)) {
    console.info(`exists: ${dest}`);
    continue;
  }

  copyFileSync(from, to);
  console.info(`created: ${dest}`);
}

console.info('Done.');
