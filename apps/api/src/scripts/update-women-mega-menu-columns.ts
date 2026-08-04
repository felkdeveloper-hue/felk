/**
 * Replace Women mega-menu text columns with the owner catalog while keeping
 * existing Specials + Shop the edit images/structure. Also ensures matching
 * category slugs exist so each link resolves.
 *
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/update-women-mega-menu-columns.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config/index.js';
import { NavigationMenuModel } from '@/models/cms-content.models.js';
import { CategoryModel } from '@/models/master-data.models.js';

type MenuLink = { label: string; slug: string; heading?: boolean };
type MenuColumn = { title: string; links: MenuLink[] };

const WOMEN_CATEGORY_COLUMNS: MenuColumn[] = [
  {
    title: 'Tops',
    links: [
      { label: 'All Tops', slug: 'all-tops' },
      { label: 'Long sleeves', slug: 'long-sleeves' },
      { label: 'Short Sleeves', slug: 'short-sleeves' },
      { label: 'Sleeveless', slug: 'sleeveless' },
      { label: 'Tube tops', slug: 'tube-tops' },
      { label: 'Halter Neck', slug: 'halter-neck' },
      { label: 'Off shoulder', slug: 'off-shoulder' },
      { label: 'Basic Tops', slug: 'basic-tops' },
      { label: 'Tshirts', slug: 'tshirts' },
      { label: 'Crop tops', slug: 'crop-tops' },
      { label: 'Bodysuits', slug: 'bodysuits' },
      { label: 'Shirts', slug: 'shirts' },
      { label: 'Jackets', slug: 'jackets' },
      { label: 'Hoodies', slug: 'hoodies' },
      { label: 'Sweater', slug: 'sweater' },
      { label: 'Corset Tops', slug: 'corset-tops' },
      { label: 'Denim Tops', slug: 'denim-tops' },
    ],
  },
  {
    title: 'Bottoms',
    links: [
      { label: 'All Bottoms', slug: 'all-bottoms' },
      { label: 'Pants', slug: '', heading: true },
      { label: 'Jeans - Denim', slug: 'jeans-denim' },
      { label: 'Leather pants', slug: 'leather-pants' },
      { label: 'Casual pants', slug: 'casual-pants' },
      { label: 'Office pants', slug: 'office-pants' },
      { label: 'Skirts', slug: '', heading: true },
      { label: 'Mini Skirts', slug: 'mini-skirts' },
      { label: 'Midi Skirts', slug: 'midi-skirts' },
      { label: 'Maxi Skirts', slug: 'maxi-skirts' },
    ],
  },
  {
    title: 'Dresses',
    links: [
      { label: 'All dresses', slug: 'all-dresses' },
      { label: 'Mini Dresses', slug: 'mini-dresses' },
      { label: 'Midi Dresses', slug: 'midi-dresses' },
      { label: 'Maxi Dresses', slug: 'maxi-dresses' },
      { label: 'Bodycon Dresses', slug: 'bodycon-dresses' },
      { label: 'Casual Dresses', slug: 'casual-dresses' },
      { label: 'Party Dress', slug: 'party-dress' },
      { label: 'Resort Wear', slug: 'resort-wear' },
    ],
  },
  {
    title: 'Co-ords',
    links: [
      { label: 'Matching sets', slug: 'matching-sets' },
      { label: 'New Arrival', slug: 'new-arrivals' },
      { label: 'Footwear', slug: '', heading: true },
      { label: 'All footwear', slug: 'all-footwear' },
      { label: 'Heels', slug: 'heels' },
      { label: 'Slippers', slug: 'slippers' },
      { label: 'Shoes', slug: 'shoes' },
    ],
  },
];

function collectCategorySlugs(columns: MenuColumn[]): Array<{ name: string; slug: string }> {
  const seen = new Set<string>();
  const rows: Array<{ name: string; slug: string }> = [];
  for (const column of columns) {
    for (const link of column.links) {
      if (link.heading || !link.slug || seen.has(link.slug)) continue;
      seen.add(link.slug);
      rows.push({ name: link.label, slug: link.slug });
    }
  }
  return rows;
}

async function ensureCategories() {
  const rows = collectCategorySlugs(WOMEN_CATEGORY_COLUMNS);
  let sortOrder = 100;
  for (const item of rows) {
    await CategoryModel.updateOne(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          path: `/${item.slug}`,
          depth: 0,
          sortOrder: sortOrder++,
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
  }
  logger.info({ count: rows.length }, 'Women mega-menu categories ready');
}

async function updateWomenMenuColumns() {
  const existing = await NavigationMenuModel.findOne({ key: 'women', isDeleted: false });
  if (!existing) {
    await NavigationMenuModel.create({
      key: 'women',
      label: 'Women',
      gender: 'women',
      columns: WOMEN_CATEGORY_COLUMNS,
      specials: [],
      featured: [],
      isDeleted: false,
    });
    logger.info('Created women mega menu with owner columns');
    return;
  }

  existing.set('columns', WOMEN_CATEGORY_COLUMNS);
  await existing.save();
  logger.info(
    {
      specials: (existing.specials ?? []).length,
      featured: (existing.featured ?? []).length,
      columns: WOMEN_CATEGORY_COLUMNS.length,
    },
    'Updated women mega-menu columns (Specials + Shop the edit preserved)',
  );
}

async function main() {
  await connectDatabase();
  await ensureCategories();
  await updateWomenMenuColumns();
  await disconnectDatabase();
  logger.info('Women mega-menu column update complete');
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Women mega-menu column update failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
