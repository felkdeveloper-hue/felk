/**
 * Seed 24 active women's products using local Product image assets
 * served from the web app public folder.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api seed:women
 */
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { computeAvailable, deriveStockStatus } from '@/utils/stock.helper';
import {
  BrandModel,
  CategoryModel,
  InventoryItemModel,
  ProductMediaModel,
  ProductModel,
  ProductVariantModel,
  WarehouseModel,
} from '@/models';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '../../../..');
const imagesDir = join(repoRoot, 'apps/web/public/catalog/women');
const WEB_ORIGIN = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

const PRODUCT_NAMES = [
  'Ruby Oversized Sweatshirt',
  'Noir Cropped Hoodie',
  'Sand Linen Midi Skirt',
  'Ivory Soft Knit Top',
  'Cocoa Cord Set',
  'Blush Relaxed Tee',
  'Olive Utility Jacket',
  'Cream Crochet Halter',
  'Charcoal Wide-Leg Pant',
  'Rose Satin Slip Dress',
  'Slate Denim Jacket',
  'Pearl Button Blouse',
  'Amber Flare Jeans',
  'Mist Soft Cardigan',
  'Berry Ribbed Tank',
  'Stone Cargo Mini',
  'Ink Wrap Blouse',
  'Honey Knit Polo',
  'Fog Oversized Shirt',
  'Wine Tailored Shorts',
  'Sky Blue Co-ord Top',
  'Espresso Leather Belt Bag',
  'Seashell Pleated Skirt',
  'Midnight Bomber Jacket',
] as const;

function publicImageUrl(filename: string) {
  return `${WEB_ORIGIN}/catalog/women/${filename}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  await connectDatabase();

  const files = (await readdir(imagesDir))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort();

  if (files.length < 20) {
    throw new Error(
      `Need at least 20 images in ${imagesDir}, found ${files.length}. Copy assets first.`,
    );
  }

  const women =
    (await CategoryModel.findOneAndUpdate(
      { slug: 'women' },
      {
        $set: {
          name: 'Women',
          slug: 'women',
          status: 'active',
          sortOrder: 1,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    )) ?? null;

  if (!women) throw new Error('Failed to ensure women category');

  const brand =
    (await BrandModel.findOne({ slug: 'forma', isDeleted: false })) ??
    (await BrandModel.findOne({ isDeleted: false }).sort({ createdAt: 1 })) ??
    (await BrandModel.create({
      name: 'FE Studio',
      slug: 'fe-studio',
      status: 'active',
    }));

  const warehouse =
    (await WarehouseModel.findOneAndUpdate(
      { code: 'MAIN' },
      {
        $set: {
          name: 'Main Colombo Warehouse',
          code: 'MAIN',
          isDefault: true,
          priority: 1,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    )) ?? null;

  const count = Math.min(PRODUCT_NAMES.length, files.length);
  let created = 0;
  let updated = 0;

  for (let index = 0; index < count; index += 1) {
    const name = PRODUCT_NAMES[index]!;
    const slug = `women-${slugify(name)}`;
    const filename = files[index]!;
    const imageUrl = publicImageUrl(filename);
    const price = 4500 + index * 350;
    const salePrice = index % 3 === 0 ? Math.round(price * 0.9) : null;
    const sku = `FE-W-${String(index + 1).padStart(3, '0')}`;

    const product = await ProductModel.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          shortDescription: `${name} — modern women's edit from FE.`,
          description: `<p>${name} crafted for everyday style. Soft hand-feel, easy fit, and a polished finish for the women's collection.</p>`,
          categoryId: women._id,
          brandId: brand._id,
          tags: ['women', 'new', 'fe'],
          searchKeywords: [name, 'women', 'fashion', 'fe'],
          gender: 'women',
          isFeatured: index < 6,
          isTrending: index % 2 === 0,
          isNewArrival: true,
          isBestSeller: index % 4 === 0,
          status: 'active',
          visibility: 'public',
          publishAt: new Date(Date.now() - index * 3_600_000),
          pricing: {
            price,
            salePrice,
            compareAtPrice: salePrice ? price : null,
            costPrice: Math.round(price * 0.45),
            currency: 'LKR',
          },
          specifications: [
            { name: 'Collection', value: 'Women', group: 'Highlights', sortOrder: 1 },
            { name: 'Fit', value: 'Regular', group: 'Highlights', sortOrder: 2 },
            { name: 'Care', value: 'Follow care label', group: 'Details', sortOrder: 3 },
          ],
          seo: {
            title: `${name} | FE Women`,
            description: `${name} from the FE women collection.`,
            ogImage: imageUrl,
          },
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const wasNew = product.createdAt?.getTime() === product.updatedAt?.getTime();
    if (wasNew) created += 1;
    else updated += 1;

    const variant = await ProductVariantModel.findOneAndUpdate(
      { sku },
      {
        $set: {
          productId: product._id,
          sku,
          title: `${name} — One Size`,
          optionValues: { Size: 'One Size' },
          price,
          salePrice,
          compareAtPrice: salePrice ? price : null,
          costPrice: Math.round(price * 0.45),
          currency: 'LKR',
          thumbnailUrl: imageUrl,
          status: 'active',
          displayOrder: 0,
          isDefault: true,
          isDeleted: false,
          deletedAt: null,
        },
        $unset: { barcode: '' },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await ProductModel.updateOne(
      { _id: product._id },
      { $set: { defaultVariantId: variant._id, variantCount: 1, sku } },
    );

    await ProductMediaModel.findOneAndUpdate(
      { productId: product._id, priority: 0 },
      {
        $set: {
          productId: product._id,
          variantId: variant._id,
          type: 'image',
          url: imageUrl,
          thumbnailUrl: imageUrl,
          alt: name,
          mimeType: filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
          priority: 0,
          isPrimary: true,
          isThumbnail: true,
          isGallery: true,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    );

    if (warehouse) {
      const onHand = 30 + index;
      const reserved = 0;
      const damaged = 0;
      const reorderPoint = 5;
      const available = computeAvailable(onHand, reserved, damaged);
      await InventoryItemModel.findOneAndUpdate(
        { warehouseId: warehouse._id, variantId: variant._id },
        {
          $set: {
            warehouseId: warehouse._id,
            variantId: variant._id,
            productId: product._id,
            sku,
            onHand,
            available,
            reserved,
            damaged,
            returned: 0,
            incoming: 0,
            reorderPoint,
            safetyStock: 3,
            stockStatus: deriveStockStatus(available, reorderPoint, 3),
            isDeleted: false,
            deletedAt: null,
          },
        },
        { upsert: true, new: true },
      );
    }

    logger.info({ slug, sku, imageUrl }, 'Women product ready');
  }

  logger.info({ created, updated, total: count }, 'Women products seed complete');
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error({ err: error }, 'Women products seed failed');
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
