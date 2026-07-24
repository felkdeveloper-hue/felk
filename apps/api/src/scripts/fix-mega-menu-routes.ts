/**
 * One-off: fix Women mega-menu "All Topwear/Bottomwear/Winterwear" routes
 * and ensure matching categories exist.
 *
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/fix-mega-menu-routes.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { CategoryModel } from '@/models/master-data.models';
import { NavigationMenuModel } from '@/models/cms-content.models';

const PARENT_CATEGORIES = [
  { name: 'All Topwear', slug: 'all-topwear', sortOrder: 20 },
  { name: 'All Bottomwear', slug: 'all-bottomwear', sortOrder: 21 },
  { name: 'All Winterwear', slug: 'all-winterwear', sortOrder: 22 },
] as const;

async function ensureCategories() {
  for (const item of PARENT_CATEGORIES) {
    await CategoryModel.updateOne(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          path: `/${item.slug}`,
          depth: 0,
          sortOrder: item.sortOrder,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
        $setOnInsert: {
          description: `Shop ${item.name.toLowerCase()}.`,
          parentId: null,
        },
      },
      { upsert: true },
    );
    logger.info({ slug: item.slug }, 'Category ready');
  }
}

async function fixWomenMenu() {
  const menu = await NavigationMenuModel.findOne({ key: 'women', isDeleted: false });
  if (!menu) {
    logger.warn('No women mega menu saved yet — defaults already use distinct routes');
    return;
  }

  const columns = (menu.columns ?? []).map((column) => {
    const title = String(column.title ?? '').toLowerCase();
    const links = (column.links ?? []).map((link) => {
      const label = String(link.label ?? '').toLowerCase();
      let slug = String(link.slug ?? '');
      if (label.includes('all topwear') || (title.includes('topwear') && label.startsWith('all'))) {
        slug = 'all-topwear';
      } else if (
        label.includes('all bottomwear') ||
        (title.includes('bottomwear') && label.startsWith('all'))
      ) {
        slug = 'all-bottomwear';
      } else if (
        label.includes('all winterwear') ||
        (title.includes('winterwear') && label.startsWith('all'))
      ) {
        slug = 'all-winterwear';
      } else if (slug === 'women' && label.startsWith('all ')) {
        if (title.includes('top')) slug = 'all-topwear';
        else if (title.includes('bottom')) slug = 'all-bottomwear';
        else if (title.includes('winter')) slug = 'all-winterwear';
      }
      return { label: link.label, slug };
    });
    return { title: column.title, links };
  });

  const featured = (menu.featured ?? []).map((tile) => {
    const label = String(tile.label ?? '').toLowerCase();
    let slug = String(tile.slug ?? '');
    if (label.includes('all topwear')) slug = 'all-topwear';
    if (label.includes('all bottomwear')) slug = 'all-bottomwear';
    if (label.includes('all winterwear')) slug = 'all-winterwear';
    return {
      label: tile.label,
      slug,
      imageUrl: tile.imageUrl ?? '',
      imageClassName: tile.imageClassName ?? null,
    };
  });

  menu.set('columns', columns);
  menu.set('featured', featured);
  await menu.save();
  logger.info({ columns, featured }, 'Women mega menu routes updated');
}

async function main() {
  await connectDatabase();
  await ensureCategories();
  await fixWomenMenu();
  await disconnectDatabase();
  logger.info('Mega menu route fix complete');
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Mega menu route fix failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
