/**
 * Turns off Best Seller on every product so merchandising can be set from scratch.
 * Product form still has the Best Seller toggle + place field.
 *
 * Usage: pnpm --filter @fe-platform/api exec tsx src/scripts/clear-best-sellers.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config/index.js';
import { ProductModel } from '@/models/index.js';
import { invalidateStorefrontCatalogCache } from '@/utils/simple-cache.js';

async function main() {
  await connectDatabase();

  const markedFilter = {
    $or: [{ isBestSeller: true }, { bestSellerPlace: { $type: 'number' } }],
  };

  const marked = await ProductModel.countDocuments(markedFilter);
  const result = await ProductModel.updateMany(markedFilter, {
    $set: { isBestSeller: false, bestSellerPlace: null },
  });

  invalidateStorefrontCatalogCache();

  logger.info(
    `Cleared Best Seller on ${result.modifiedCount} product(s) (${marked} matched). Re-enable from each product with a place number.`,
  );
  await disconnectDatabase();
}

main().catch((error) => {
  logger.error('Failed to clear Best Seller flags', error);
  process.exit(1);
});
