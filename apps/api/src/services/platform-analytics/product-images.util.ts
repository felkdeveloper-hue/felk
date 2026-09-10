import { Types } from 'mongoose';
import { MEDIA_TYPES } from '@/constants/product.js';
import { ProductMediaModel } from '@/models/product.models.js';
import { toPublicMediaUrl } from '@/utils/public-media-url.js';

export function publicProductImage(url?: string | null): string | undefined {
  if (!url) return undefined;
  return toPublicMediaUrl(url) ?? url;
}

export async function productImagesById(productIds: string[]): Promise<Map<string, string>> {
  const unique = [
    ...new Set(productIds.filter((id) => id && Types.ObjectId.isValid(id))),
  ];
  if (!unique.length) return new Map();

  const media = await ProductMediaModel.find({
    productId: { $in: unique.map((id) => new Types.ObjectId(id)) },
    isDeleted: false,
    type: MEDIA_TYPES.IMAGE,
  })
    .select('productId url thumbnailUrl')
    .sort({ isPrimary: -1, priority: 1, createdAt: 1 })
    .lean();

  const imageById = new Map<string, string>();
  for (const row of media) {
    const productId = String(row.productId);
    if (imageById.has(productId)) continue;
    const url =
      (typeof row.thumbnailUrl === 'string' && row.thumbnailUrl.trim()) ||
      (typeof row.url === 'string' && row.url.trim()) ||
      '';
    if (url) imageById.set(productId, publicProductImage(url) ?? url);
  }

  return imageById;
}

export async function attachProductImages<T extends { productId: string; image?: string | null }>(
  rows: T[],
  imageById?: Map<string, string>,
): Promise<Array<T & { image: string | null }>> {
  const images = imageById ?? (await productImagesById(rows.filter((row) => !row.image).map((row) => row.productId)));
  return rows.map((row) => ({
    ...row,
    image: row.image || images.get(row.productId) || null,
  }));
}

export async function attachProductImagesToLists<
  T extends { productId: string; image?: string | null },
>(lists: T[][]): Promise<Array<Array<T & { image: string | null }>>> {
  const missing = lists.flatMap((rows) =>
    rows.filter((row) => !row.image).map((row) => row.productId),
  );
  const imageById = await productImagesById(missing);
  return Promise.all(lists.map((rows) => attachProductImages(rows, imageById)));
}
