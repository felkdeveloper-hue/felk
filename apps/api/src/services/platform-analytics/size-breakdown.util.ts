import { ProductVariantModel } from '@/models/product.models.js';
import { SizeModel } from '@/models/master-data.models.js';

export interface SizeCount {
  size: string;
  count: number;
}

const SIZE_WORD =
  /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|one size|free size|os|free)$/i;
const SIZE_NAME = /^(extra\s*)?(small|medium|large)$/i;
const SIZE_NUMBER = /^(\d{1,3}(\.\d)?|uk\s*\d+|us\s*\d+|eu\s*\d+)$/i;

export function normalizeSizeLabel(raw?: string | null): string {
  const value = (raw ?? '').trim();
  return value || 'Unknown';
}

export function looksLikeSize(raw?: string | null): boolean {
  const value = (raw ?? '').trim();
  if (!value) return false;
  return SIZE_WORD.test(value) || SIZE_NAME.test(value) || SIZE_NUMBER.test(value);
}

/** Variant titles are usually "Color / Size". */
export function sizeFromVariantTitle(title?: string | null): string {
  const value = (title ?? '').trim();
  if (!value) return '';
  const parts = value
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1] ?? '';
  return looksLikeSize(value) ? value : '';
}

export function toSizeCounts(counts: Map<string, number>): SizeCount[] {
  return [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count || a.size.localeCompare(b.size));
}

export function formatSizeBreakdown(sizes: SizeCount[]): string {
  return sizes.map((row) => `${row.size} ${row.count}`).join(' · ');
}

function optionSize(optionValues: unknown): string {
  if (!optionValues) return '';
  if (optionValues instanceof Map) {
    const value = optionValues.get('size');
    return typeof value === 'string' ? value.trim() : '';
  }
  if (typeof optionValues === 'object') {
    const value = (optionValues as Record<string, unknown>).size;
    return typeof value === 'string' ? value.trim() : '';
  }
  return '';
}

/** Resolve catalog size names for a batch of variant ids. */
export async function sizeNameByVariantId(variantIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(variantIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;

  const variants = await ProductVariantModel.find({ _id: { $in: unique } })
    .select('sizeId title optionValues')
    .lean();

  const sizeIds = [
    ...new Set(
      variants.map((variant) => (variant.sizeId ? String(variant.sizeId) : '')).filter(Boolean),
    ),
  ];
  const sizes = sizeIds.length
    ? await SizeModel.find({ _id: { $in: sizeIds } }).select('name').lean()
    : [];
  const sizeById = new Map(
    sizes.map((size) => [String(size._id), typeof size.name === 'string' ? size.name.trim() : '']),
  );

  for (const variant of variants) {
    const fromCatalog = variant.sizeId ? sizeById.get(String(variant.sizeId)) : undefined;
    const label =
      fromCatalog ||
      optionSize(variant.optionValues) ||
      sizeFromVariantTitle(typeof variant.title === 'string' ? variant.title : '');
    if (label) out.set(String(variant._id), label);
  }

  return out;
}

export function pickSizeLabel(input: {
  sizeName?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  variantTitle?: string | null;
  sizeByVariant?: Map<string, string>;
}): string {
  const explicit = (input.sizeName ?? '').trim();
  if (explicit) return explicit;
  const fromVariant = input.variantId
    ? input.sizeByVariant?.get(String(input.variantId))
    : undefined;
  if (fromVariant) return fromVariant;
  const fromTitle = sizeFromVariantTitle(input.variantTitle);
  if (fromTitle) return fromTitle;
  const label = (input.variantLabel ?? '').trim();
  if (label && looksLikeSize(label)) return label;
  return 'Unknown';
}
