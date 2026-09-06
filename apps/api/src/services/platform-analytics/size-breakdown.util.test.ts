import { describe, expect, it } from 'vitest';
import {
  formatSizeBreakdown,
  looksLikeSize,
  normalizeSizeLabel,
  pickSizeLabel,
  sizeFromVariantTitle,
  toSizeCounts,
} from './size-breakdown.util.js';

describe('size breakdown helpers', () => {
  it('reads the size from a Color / Size variant title', () => {
    expect(sizeFromVariantTitle('Black / Small')).toBe('Small');
    expect(sizeFromVariantTitle('Ivory / L')).toBe('L');
    expect(sizeFromVariantTitle('S')).toBe('S');
    expect(sizeFromVariantTitle('Varsity V-Neck Crop Top')).toBe('');
  });

  it('recognizes common size labels', () => {
    expect(looksLikeSize('Small')).toBe(true);
    expect(looksLikeSize('XL')).toBe(true);
    expect(looksLikeSize('32')).toBe(true);
    expect(looksLikeSize('Black')).toBe(false);
    expect(looksLikeSize('Varsity V-Neck Crop Top')).toBe(false);
  });

  it('prefers an explicit size, then the catalog variant, then a size-like label', () => {
    const sizeByVariant = new Map([['var_1', 'Medium']]);
    expect(pickSizeLabel({ sizeName: 'Large', variantId: 'var_1', sizeByVariant })).toBe('Large');
    expect(pickSizeLabel({ variantId: 'var_1', variantLabel: 'Black', sizeByVariant })).toBe(
      'Medium',
    );
    expect(pickSizeLabel({ variantLabel: 'XL' })).toBe('XL');
    expect(pickSizeLabel({ variantLabel: 'Black' })).toBe('Unknown');
    expect(pickSizeLabel({ variantTitle: 'Olive / S' })).toBe('S');
  });

  it('formats size counts the way the admin table should read them', () => {
    const sizes = toSizeCounts(
      new Map([
        ['Small', 3],
        ['Large', 2],
        ['Medium', 2],
      ]),
    );
    expect(sizes[0]).toEqual({ size: 'Small', count: 3 });
    expect(formatSizeBreakdown(sizes)).toBe('Small 3 · Large 2 · Medium 2');
    expect(normalizeSizeLabel('  M  ')).toBe('M');
    expect(normalizeSizeLabel('')).toBe('Unknown');
  });
});
