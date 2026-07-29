/**
 * Local storefront product-list profiler (mongodb-memory-server).
 *
 * Usage:
 *   pnpm --filter @fe-platform/api exec tsx --tsconfig tsconfig.json src/scripts/profile-storefront.ts
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = `${mongod.getUri()}perf`;
  process.env.NODE_ENV = 'test';

  const { ProductModel, ProductVariantModel, ProductMediaModel } =
    await import('@/models/product.models.js');
  const { productService } = await import('@/services/product.service.js');
  const { PRODUCT_STATUS, PRODUCT_VISIBILITY } = await import('@/constants/product.js');

  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([
    ProductModel.syncIndexes(),
    ProductVariantModel.syncIndexes(),
    ProductMediaModel.syncIndexes(),
  ]);

  const count = 200;
  const products = Array.from({ length: count }, (_, i) => ({
    name: `Perf Dress ${i}`,
    slug: `perf-dress-${i}`,
    status: PRODUCT_STATUS.ACTIVE,
    visibility: PRODUCT_VISIBILITY.PUBLIC,
    gender: i % 2 === 0 ? 'women' : 'men',
    isBestSeller: i % 5 === 0,
    isMoreToLove: i % 7 === 0,
    tags: ['perf', 'dress'],
    searchKeywords: ['linen', 'summer'],
    collectionIds: [],
    occasionIds: [],
    specifications: [],
    attributeLinks: [],
    pricing: { price: 2500 + i, salePrice: null, currency: 'LKR' },
    variantCount: 3,
    isDeleted: false,
  }));
  const inserted = await ProductModel.insertMany(products);

  const variants = [];
  const media = [];
  for (const product of inserted) {
    for (let v = 0; v < 3; v += 1) {
      variants.push({
        productId: product._id,
        sku: `SKU-${String(product._id).slice(-6)}-${v}`,
        title: `Color ${v} / M`,
        price: 2500,
        currency: 'LKR',
        status: 'active',
        isDefault: v === 0,
        listSeparately: false,
        displayOrder: v,
        isDeleted: false,
      });
    }
    for (let m = 0; m < 8; m += 1) {
      media.push({
        productId: product._id,
        url: `https://cdn.example/p/${product._id}/${m}.webp`,
        thumbnailUrl: `https://cdn.example/p/${product._id}/${m}-thumb.webp`,
        priority: m,
        isPrimary: m === 0,
        isDeleted: false,
      });
    }
  }
  await ProductVariantModel.insertMany(variants);
  await ProductMediaModel.insertMany(media);
  console.log(`Seeded ${count} products (3 variants, 8 media each)\n`);

  const explain = await ProductModel.find({
    gender: 'women',
    isDeleted: false,
    status: PRODUCT_STATUS.ACTIVE,
  })
    .sort({ createdAt: -1 })
    .limit(16)
    .explain('executionStats');

  const stats = (
    explain as {
      executionStats?: {
        executionTimeMillis?: number;
        totalDocsExamined?: number;
        nReturned?: number;
        executionStages?: { stage?: string; inputStage?: { stage?: string; indexName?: string } };
      };
    }
  ).executionStats;
  console.log('Explain women listing:');
  console.log(
    `  nReturned=${stats?.nReturned} examined=${stats?.totalDocsExamined} ms=${stats?.executionTimeMillis} stage=${stats?.executionStages?.stage} index=${stats?.executionStages?.inputStage?.indexName ?? stats?.executionStages?.inputStage?.stage}`,
  );
  console.log('');

  async function time(label: string, fn: () => Promise<unknown>) {
    const started = performance.now();
    const result = await fn();
    const ms = performance.now() - started;
    const size = Buffer.byteLength(JSON.stringify(result));
    console.log(
      `${label.padEnd(42)} ${ms.toFixed(1).padStart(8)}ms  payload≈${(size / 1024).toFixed(1)}KB`,
    );
  }

  const listWomen = () =>
    productService.list({
      gender: 'women',
      status: PRODUCT_STATUS.ACTIVE,
      excludeVisibility: ['hidden'],
      page: 1,
      limit: 16,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      includeDeleted: false,
    });

  await time('list gender=women limit=16 (cold)', listWomen);
  await time('list gender=women limit=16 (warm)', listWomen);
  await time('list q=linen summer (text)', () =>
    productService.list({
      q: 'linen summer',
      status: PRODUCT_STATUS.ACTIVE,
      page: 1,
      limit: 16,
      includeDeleted: false,
    }),
  );
  await time('list isBestSeller limit=8', () =>
    productService.list({
      isBestSeller: true,
      status: PRODUCT_STATUS.ACTIVE,
      page: 1,
      limit: 8,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      includeDeleted: false,
    }),
  );

  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
