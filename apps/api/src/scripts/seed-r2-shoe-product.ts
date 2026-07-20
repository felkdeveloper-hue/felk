/**
 * Creates a published shoe product with a real image uploaded to Cloudflare R2.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api seed:r2-shoe
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { BrandModel, CategoryModel, InventoryItemModel, WarehouseModel } from '@/models';
import { productRepository } from '@/repositories/product.repository';
import type { ActorMeta } from '@/services/cms-crud.service';
import { productMediaService } from '@/services/product-media.service';
import { productService } from '@/services/product.service';
import { productVariantService } from '@/services/product-variant.service';
import { logStorageBackend } from '@/storage';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const IMAGE_PATH = join(scriptDir, 'assets', 'slate-blue-loafers.png');

const PRODUCT = {
  name: 'Slate Blue Comfort Loafers',
  slug: 'slate-blue-comfort-loafers',
  shortDescription: 'Premium moc-toe sport loafers with a cushioned platform sole.',
  description:
    '<p>Matte slate blue upper with a light gray platform sole. Moc-toe stitching, short laces, and all-day comfort for casual wear.</p>',
  gender: 'men',
  price: 18900,
  salePrice: 16900,
  color: 'Slate Blue',
  size: '42',
} as const;

const actor: ActorMeta = {
  ip: '127.0.0.1',
  requestId: 'seed-r2-shoe',
};

async function main() {
  logStorageBackend();

  const category = await CategoryModel.findOne({ slug: 'shoes', isDeleted: false });
  if (!category) {
    throw new Error('Shoes category not found. Run seed:catalog first.');
  }

  const brand =
    (await BrandModel.findOne({ slug: 'north-and-loom', isDeleted: false })) ??
    (await BrandModel.findOne({ isDeleted: false }).sort({ createdAt: 1 }));

  let product = await productRepository.findBySlug(PRODUCT.slug);

  if (!product) {
    product = await productService.create(
      {
        name: PRODUCT.name,
        slug: PRODUCT.slug,
        shortDescription: PRODUCT.shortDescription,
        description: PRODUCT.description,
        categoryId: category._id.toString(),
        brandId: brand?._id.toString(),
        gender: PRODUCT.gender,
        status: 'draft',
        pricing: {
          price: PRODUCT.price,
          salePrice: PRODUCT.salePrice,
          compareAtPrice: PRODUCT.price,
          currency: 'LKR',
        },
        tags: ['shoes', 'loafers', 'men', 'casual'],
        searchKeywords: [PRODUCT.name, 'shoes', 'loafers', 'men'],
        specifications: [
          { name: 'Style', value: 'Moc-toe loafer', group: 'Highlights', sortOrder: 1 },
          { name: 'Sole', value: 'Platform comfort sole', group: 'Highlights', sortOrder: 2 },
          { name: 'Color', value: PRODUCT.color, group: 'Details', sortOrder: 3 },
        ],
      },
      actor,
    );
    logger.info({ productId: product._id, sku: product.sku }, 'Created product');
  } else {
    logger.info(
      { productId: product._id, sku: product.sku },
      'Product already exists — refreshing media',
    );
  }

  const productId = String(product._id);

  const buffer = await readFile(IMAGE_PATH);
  const file = {
    fieldname: 'file',
    originalname: 'slate-blue-loafers.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer,
    size: buffer.length,
  } as Express.Multer.File;

  const media = await productMediaService.uploadImage(
    productId,
    file,
    {
      alt: PRODUCT.name,
      isPrimary: true,
      isThumbnail: true,
      isGallery: true,
      priority: 0,
    },
    actor,
  );

  logger.info({ mediaId: media._id, url: media.url, key: media.key }, 'Uploaded image to R2');

  const variants = await productVariantService.listByProduct(productId);
  let variantId = variants[0] ? String((variants[0] as { _id?: unknown })._id ?? '') : '';
  let variantSku = variants[0] ? String((variants[0] as { sku?: unknown }).sku ?? '') : '';

  if (!variantId) {
    const created = await productVariantService.create(
      productId,
      {
        title: `${PRODUCT.name} — ${PRODUCT.color} / EU ${PRODUCT.size}`,
        optionValues: { Color: PRODUCT.color, Size: PRODUCT.size },
        price: PRODUCT.price,
        salePrice: PRODUCT.salePrice,
        compareAtPrice: PRODUCT.price,
        currency: 'LKR',
        thumbnailUrl: media.url,
        barcode: `FELOAFER${Date.now().toString().slice(-8)}`,
      },
      actor,
    );
    variantId = String(created._id);
    variantSku = String(created.sku);
    logger.info({ variantId, sku: variantSku }, 'Created variant');
  }

  const warehouse =
    (await WarehouseModel.findOne({ isDeleted: false, status: 'active' }).sort({ createdAt: 1 })) ??
    (await WarehouseModel.findOne({ isDeleted: false }).sort({ createdAt: 1 }));

  if (warehouse && variantId) {
    await InventoryItemModel.findOneAndUpdate(
      { warehouseId: warehouse._id, variantId },
      {
        $set: {
          warehouseId: warehouse._id,
          variantId,
          productId: product._id,
          quantityAvailable: 25,
          quantityReserved: 0,
          quantityIncoming: 0,
          reorderPoint: 5,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }

  await productService.publish(productId, actor);

  logger.info(
    {
      productId,
      slug: PRODUCT.slug,
      imageUrl: media.url,
      r2Key: media.key,
    },
    '✅ Slate Blue Comfort Loafers is live — check your Cloudflare R2 bucket for the uploaded file',
  );
}

connectDatabase()
  .then(main)
  .catch((error) => {
    logger.error({ err: error }, 'seed-r2-shoe failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
