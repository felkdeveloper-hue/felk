import { describe, expect, it } from 'vitest';
import {
  extractR2ObjectKey,
  isR2DevUrl,
  rewriteR2DevUrl,
  sanitizeStorageKey,
} from './public-media-url.js';

describe('public media URL', () => {
  const sample =
    'https://pub-3ea3125fe4db4405b6fce21ead15fc1f.r2.dev/products/abc/images/file.webp';

  it('detects r2.dev hosts', () => {
    expect(isR2DevUrl(sample)).toBe(true);
    expect(isR2DevUrl('https://cdn.fe.lk/products/abc/images/file.webp')).toBe(false);
  });

  it('extracts the object key', () => {
    expect(extractR2ObjectKey(sample)).toBe('products/abc/images/file.webp');
  });

  it('rewrites r2.dev to a first-party media path', () => {
    expect(rewriteR2DevUrl(sample, 'https://api.fe.lk/api/v1/media')).toBe(
      'https://api.fe.lk/api/v1/media/products/abc/images/file.webp',
    );
  });

  it('leaves non-R2 URLs unchanged', () => {
    expect(rewriteR2DevUrl('https://fe.lk/cdn/x.webp', 'https://api.fe.lk/api/v1/media')).toBe(
      'https://fe.lk/cdn/x.webp',
    );
  });

  it('rejects unsafe storage keys', () => {
    expect(sanitizeStorageKey('../secret')).toBeNull();
    expect(sanitizeStorageKey('/products/abc/images/file.webp')).toBe(
      'products/abc/images/file.webp',
    );
  });
});
