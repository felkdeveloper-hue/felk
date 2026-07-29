/**
 * One-shot codemod: rewrite local ESM import/export specifiers for NodeNext.
 * - Adds `.js` when the target is a .ts/.tsx file
 * - Adds `/index.js` when the target is a directory with index.ts
 * Skips packages, node: builtins, and specifiers that already have an extension.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');

/** Matches local specifiers after `from` or dynamic `import(` (supports multiline). */
const SPECIFIER_RE =
  /(?<=(?:\bfrom\s+|import\s*\(\s*))(['"])(@\/[^'"]+|\.\.?\/[^'"]+)\1/g;

function listTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      listTsFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

function resolveAliasOrRelative(specifier, fromFile) {
  if (specifier.startsWith('@/')) {
    return path.join(srcRoot, specifier.slice(2));
  }
  return path.resolve(path.dirname(fromFile), specifier);
}

function hasCodeExtension(specifier) {
  return /\.(js|mjs|cjs|ts|tsx|json)$/.test(specifier);
}

function rewriteSpecifier(specifier, fromFile) {
  if (hasCodeExtension(specifier)) return specifier;

  const resolved = resolveAliasOrRelative(specifier, fromFile);
  const asFileTs = `${resolved}.ts`;
  const asFileTsx = `${resolved}.tsx`;
  const asIndexTs = path.join(resolved, 'index.ts');
  const asIndexTsx = path.join(resolved, 'index.tsx');

  if (fs.existsSync(asFileTs) || fs.existsSync(asFileTsx)) {
    return `${specifier}.js`;
  }
  if (fs.existsSync(asIndexTs) || fs.existsSync(asIndexTsx)) {
    return `${specifier}/index.js`;
  }
  return specifier;
}

function transformFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const next = original.replace(SPECIFIER_RE, (match, quote, specifier) => {
    const updated = rewriteSpecifier(specifier, filePath);
    if (updated !== specifier) {
      changed = true;
      return `${quote}${updated}${quote}`;
    }
    return match;
  });
  if (changed) fs.writeFileSync(filePath, next);
  return changed;
}

const files = listTsFiles(srcRoot);
let count = 0;
for (const file of files) {
  if (transformFile(file)) count += 1;
}
console.log(`Updated ${count} / ${files.length} files`);
