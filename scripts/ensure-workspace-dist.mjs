/**
 * Ensure workspace packages that export `dist/` exist before `pnpm dev`.
 * Skips rebuild when dist is already present — keeps local startup fast.
 * Production/CI still uses `turbo run build` with full dependsOn.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGES = [
  { filter: '@fe-platform/utils', distFile: 'packages/utils/dist/index.js' },
  { filter: '@fe-platform/types', distFile: 'packages/types/dist/index.js' },
  { filter: '@fe-platform/config', distFile: 'packages/config/dist/index.js' },
];

const missing = PACKAGES.filter((pkg) => !existsSync(join(root, pkg.distFile)));

if (missing.length === 0) {
  process.exit(0);
}

const filters = missing.flatMap((pkg) => ['--filter', pkg.filter]);
const result = spawnSync(
  'pnpm',
  ['exec', 'turbo', 'run', 'build', ...filters],
  { cwd: root, stdio: 'inherit', shell: true },
);

process.exit(result.status ?? 1);
