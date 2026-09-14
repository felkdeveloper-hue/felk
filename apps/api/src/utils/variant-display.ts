import { ColorModel, SizeModel } from '@/models/master-data.models.js';
import { ProductVariantModel } from '@/models/product.models.js';

export function composeVariantTitle(
  colorName?: string | null,
  sizeName?: string | null,
  fallback?: string | null,
): string | null {
  const color = (colorName ?? '').trim();
  const size = (sizeName ?? '').trim();
  const fallbackTitle = (fallback ?? '').trim();
  if (color && size) return `${color} / ${size}`;
  if (color) {
    if (variantTitleLooksComplete(fallbackTitle)) return fallbackTitle;
    if (fallbackTitle && fallbackTitle !== color) return `${color} / ${fallbackTitle}`;
    return color;
  }
  if (variantTitleLooksComplete(fallbackTitle)) return fallbackTitle;
  if (size) return size;
  return fallbackTitle || null;
}

export function variantTitleLooksComplete(
  title?: string | null,
  colorName?: string | null,
): boolean {
  if ((colorName ?? '').trim()) return true;
  const value = (title ?? '').trim();
  if (!value) return false;
  return value.includes(' / ');
}

export async function colorAndSizeByVariantId(
  variantIds: string[],
): Promise<Map<string, { colorName?: string; sizeName?: string }>> {
  const unique = [...new Set(variantIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const out = new Map<string, { colorName?: string; sizeName?: string }>();
  if (!unique.length) return out;

  const variants = await ProductVariantModel.find({ _id: { $in: unique } })
    .select('colorId sizeId')
    .lean();

  const colorIds = [
    ...new Set(
      variants.map((variant) => (variant.colorId ? String(variant.colorId) : '')).filter(Boolean),
    ),
  ];
  const sizeIds = [
    ...new Set(
      variants.map((variant) => (variant.sizeId ? String(variant.sizeId) : '')).filter(Boolean),
    ),
  ];

  const [colors, sizes] = await Promise.all([
    colorIds.length
      ? ColorModel.find({ _id: { $in: colorIds } }).select('name').lean()
      : Promise.resolve([]),
    sizeIds.length
      ? SizeModel.find({ _id: { $in: sizeIds } }).select('name').lean()
      : Promise.resolve([]),
  ]);

  const colorById = new Map(
    colors.map((row) => [
      String(row._id),
      typeof row.name === 'string' ? row.name.trim() : '',
    ]),
  );
  const sizeById = new Map(
    sizes.map((row) => [String(row._id), typeof row.name === 'string' ? row.name.trim() : '']),
  );

  for (const variant of variants) {
    const colorName = variant.colorId ? colorById.get(String(variant.colorId)) : undefined;
    const sizeName = variant.sizeId ? sizeById.get(String(variant.sizeId)) : undefined;
    out.set(String(variant._id), {
      ...(colorName ? { colorName } : {}),
      ...(sizeName ? { sizeName } : {}),
    });
  }

  return out;
}

export async function enrichItemsVariantDisplay<
  T extends {
    variantId?: unknown;
    variantTitle?: string | null;
    colorName?: string | null;
    sizeName?: string | null;
  },
>(items: T[]): Promise<T[]> {
  const missingIds = items
    .filter((item) => !variantTitleLooksComplete(item.variantTitle, item.colorName))
    .map((item) => String(item.variantId ?? ''))
    .filter(Boolean);
  const lookup = await colorAndSizeByVariantId(missingIds);

  return items.map((item) => {
    const looked = lookup.get(String(item.variantId ?? ''));
    const colorName = (item.colorName ?? '').trim() || looked?.colorName || null;
    const sizeName = (item.sizeName ?? '').trim() || looked?.sizeName || null;
    const variantTitle =
      composeVariantTitle(colorName, sizeName, item.variantTitle) ?? item.variantTitle ?? null;
    return { ...item, colorName, sizeName, variantTitle };
  });
}
