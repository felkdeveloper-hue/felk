/**
 * Upsert homepage category tiles (name + image) into CMS categories.
 *
 * Copies local assets into the web public folder and points category.image
 * at those URLs so the storefront grid can render immediately.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api seed:home-categories
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { CategoryModel } from '@/models';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '../../../..');
const sourceDir = join(repoRoot, 'apps/web/src/assets/images/Categories');
const publicDir = join(repoRoot, 'apps/web/public/catalog/categories');
const HOME_CATEGORIES = [
  { name: 'New Arrival', slug: 'new-arrivals', source: 'New Arrival.png', sortOrder: 1 },
  { name: 'Jeans', slug: 'jeans', source: 'Jeans.png', sortOrder: 2 },
  { name: 'Oversized', slug: 'oversized', source: 'Oversized.png', sortOrder: 3 },
  { name: 'Corset', slug: 'corset', source: 'Corset.png', sortOrder: 4 },
  { name: 'Hoodies', slug: 'hoodies', source: 'Hoddiewomen.png', sortOrder: 5 },
  { name: 'Jackets', slug: 'jackets', source: 'WomenJacket.png', sortOrder: 6 },
  { name: 'Bags', slug: 'bags', source: 'Bags.png', sortOrder: 7 },
  { name: 'Shoes', slug: 'shoes', source: 'Shoes.png', sortOrder: 8 },
] as const;

/** Relative URL so images load from whichever host serves the web app. */
function publicImageUrl(filename: string) {
  return `/catalog/categories/${filename}`;
}

async function main() {
  await connectDatabase();
  await mkdir(publicDir, { recursive: true });

  for (const item of HOME_CATEGORIES) {
    const destName = `${item.slug}.png`;
    await copyFile(join(sourceDir, item.source), join(publicDir, destName));
    const imageUrl = publicImageUrl(destName);

    await CategoryModel.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          status: 'active',
          sortOrder: item.sortOrder,
          parentId: null,
          path: `/${item.slug}`,
          depth: 0,
          isDeleted: false,
          deletedAt: null,
          image: {
            url: imageUrl,
            key: null,
            alt: item.name,
          },
        },
      },
      { upsert: true, new: true },
    );

    logger.info({ slug: item.slug, imageUrl }, 'Upserted homepage category');
  }

  await disconnectDatabase();
  logger.info(`Seeded ${HOME_CATEGORIES.length} homepage categories`);
}

main().catch(async (error) => {
  logger.error(error, 'Failed to seed homepage categories');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
