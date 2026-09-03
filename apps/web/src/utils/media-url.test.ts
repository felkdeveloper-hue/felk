import { describe, expect, it } from 'vitest';
import { extractR2ObjectKey, toStorefrontMediaUrl } from './media-url';

describe('toStorefrontMediaUrl', () => {
  const r2 = 'https://pub-3ea3125fe4db4405b6fce21ead15fc1f.r2.dev/products/abc/images/file.webp';
  const r2Video =
    'https://pub-3ea3125fe4db4405b6fce21ead15fc1f.r2.dev/promo-banners/abc/videos/clip.mp4';

  it('extracts the R2 object key', () => {
    expect(extractR2ObjectKey(r2)).toBe('products/abc/images/file.webp');
  });

  it('rewrites r2.dev images to same-origin /cdn', () => {
    expect(toStorefrontMediaUrl(r2)).toBe('/cdn/products/abc/images/file.webp');
  });

  it('leaves r2.dev videos on the public R2 origin (Vercel /cdn breaks Range)', () => {
    expect(toStorefrontMediaUrl(r2Video)).toBe(r2Video);
  });

  it('rewrites already-/cdn video paths back to R2 to escape poisoned cache', () => {
    expect(toStorefrontMediaUrl('/cdn/promo-banners/abc/videos/clip.mp4')).toBe(r2Video);
  });

  it('leaves bundled and data URLs unchanged', () => {
    expect(toStorefrontMediaUrl('/assets/hero.webp')).toBe('/assets/hero.webp');
    expect(toStorefrontMediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });
});
