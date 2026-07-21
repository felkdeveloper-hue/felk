/**
 * Deactivates mock seed hero banners so the storefront falls back to local uploaded images.
 * Usage: pnpm --filter @fe-platform/api exec tsx src/scripts/deactivate-seed-hero-banners.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { HeroBannerModel } from '@/models';

const SEED_TITLES = [
  'Color, cut, confidence.',
  'Quiet luxury, loud presence.',
  'Weekend energy, elevated.',
];

async function main() {
  await connectDatabase();

  const result = await HeroBannerModel.updateMany(
    { title: { $in: SEED_TITLES } },
    { $set: { status: 'inactive' } },
  );

  logger.info(`Deactivated ${result.modifiedCount} seed hero banner(s)`);
  await disconnectDatabase();
}

main().catch((error) => {
  logger.error('Failed to deactivate seed hero banners', error);
  process.exit(1);
});
