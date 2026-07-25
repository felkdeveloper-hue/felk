/**
 * Ensure the store brand "FE.LK OFFICIAL" exists, then print current brands.
 *
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/ensure-official-brand.ts
 */
import { connectDatabase, disconnectDatabase } from '@/config';
import { OFFICIAL_BRAND_NAME, OFFICIAL_BRAND_SLUG } from '@/constants/product';
import { BrandModel } from '@/models/master-data.models';
import { ProductModel } from '@/models/product.models';

async function main() {
  await connectDatabase();

  const existing = await BrandModel.findOne({
    isDeleted: false,
    $or: [
      { slug: OFFICIAL_BRAND_SLUG },
      { name: new RegExp('^FE\\.?LK\\s*OFFICIAL$', 'i') },
      { name: /FE\.?LK/i },
    ],
  });

  let brandId: string;
  if (existing) {
    existing.set({
      name: OFFICIAL_BRAND_NAME,
      slug: OFFICIAL_BRAND_SLUG,
      status: 'active',
      isDeleted: false,
      deletedAt: null,
    });
    await existing.save();
    brandId = String(existing._id);
    console.log('Updated brand:', brandId, existing.name);
  } else {
    const created = await BrandModel.create({
      name: OFFICIAL_BRAND_NAME,
      slug: OFFICIAL_BRAND_SLUG,
      status: 'active',
      sortOrder: 0,
    });
    brandId = String(created._id);
    console.log('Created brand:', brandId, created.name);
  }

  const result = await ProductModel.updateMany(
    {
      isDeleted: false,
      $or: [{ brandId: null }, { brandId: { $exists: false } }],
    },
    { $set: { brandId } },
  );
  console.log(`Backfilled brand on ${result.modifiedCount} products`);

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
