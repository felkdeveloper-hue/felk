/**
 * Replace the category catalog with the owner Women taxonomy only.
 * Builds a real parent/child tree so "Long sleeves" lives under "All Tops".
 * Archives every other active category so old options disappear from admin.
 *
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/seed-owner-category-tree.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config/index.js';
import { NavigationMenuModel } from '@/models/cms-content.models.js';
import { CategoryModel } from '@/models/master-data.models.js';

type CatNode = {
  name: string;
  slug: string;
  children?: CatNode[];
};

/** Owner catalog — only these categories stay active. */
const OWNER_TREE: CatNode[] = [
  {
    name: 'All Tops',
    slug: 'all-tops',
    children: [
      { name: 'Long sleeves', slug: 'long-sleeves' },
      { name: 'Short Sleeves', slug: 'short-sleeves' },
      { name: 'Sleeveless', slug: 'sleeveless' },
      { name: 'Tube tops', slug: 'tube-tops' },
      { name: 'Halter Neck', slug: 'halter-neck' },
      { name: 'Off shoulder', slug: 'off-shoulder' },
      { name: 'Basic Tops', slug: 'basic-tops' },
      { name: 'Tshirts', slug: 'tshirts' },
      { name: 'Crop tops', slug: 'crop-tops' },
      { name: 'Bodysuits', slug: 'bodysuits' },
      { name: 'Shirts', slug: 'shirts' },
      { name: 'Jackets', slug: 'jackets' },
      { name: 'Hoodies', slug: 'hoodies' },
      { name: 'Sweater', slug: 'sweater' },
      { name: 'Corset Tops', slug: 'corset-tops' },
      { name: 'Denim Tops', slug: 'denim-tops' },
    ],
  },
  {
    name: 'All Bottoms',
    slug: 'all-bottoms',
    children: [
      {
        name: 'Pants',
        slug: 'pants',
        children: [
          { name: 'Jeans - Denim', slug: 'jeans-denim' },
          { name: 'Leather pants', slug: 'leather-pants' },
          { name: 'Casual pants', slug: 'casual-pants' },
          { name: 'Office pants', slug: 'office-pants' },
        ],
      },
      {
        name: 'Skirts',
        slug: 'skirts',
        children: [
          { name: 'Mini Skirts', slug: 'mini-skirts' },
          { name: 'Midi Skirts', slug: 'midi-skirts' },
          { name: 'Maxi Skirts', slug: 'maxi-skirts' },
        ],
      },
    ],
  },
  {
    name: 'All dresses',
    slug: 'all-dresses',
    children: [
      { name: 'Mini Dresses', slug: 'mini-dresses' },
      { name: 'Midi Dresses', slug: 'midi-dresses' },
      { name: 'Maxi Dresses', slug: 'maxi-dresses' },
      { name: 'Bodycon Dresses', slug: 'bodycon-dresses' },
      { name: 'Casual Dresses', slug: 'casual-dresses' },
      { name: 'Party Dress', slug: 'party-dress' },
      { name: 'Resort Wear', slug: 'resort-wear' },
    ],
  },
  {
    name: 'Co-ords',
    slug: 'co-ords',
    children: [{ name: 'Matching sets', slug: 'matching-sets' }],
  },
  {
    name: 'All footwear',
    slug: 'all-footwear',
    children: [
      { name: 'Heels', slug: 'heels' },
      { name: 'Slippers', slug: 'slippers' },
      { name: 'Shoes', slug: 'shoes' },
    ],
  },
];

/** Mega-menu Specials / Shop the edit still need these campaign links. */
const CAMPAIGN_CATEGORIES: Array<{ name: string; slug: string; sortOrder: number }> = [
  { name: 'New Arrivals', slug: 'new-arrivals', sortOrder: 900 },
  { name: 'Oversized', slug: 'oversized', sortOrder: 901 },
];

function collectSlugs(nodes: CatNode[], into = new Set<string>()): Set<string> {
  for (const node of nodes) {
    into.add(node.slug);
    if (node.children?.length) collectSlugs(node.children, into);
  }
  return into;
}

async function upsertNode(
  node: CatNode,
  parentId: string | null,
  parentPath: string,
  depth: number,
  sortOrder: number,
): Promise<string> {
  const path = parentPath ? `${parentPath}/${node.slug}` : `/${node.slug}`;
  await CategoryModel.updateOne(
    { slug: node.slug },
    {
      $set: {
        name: node.name,
        slug: node.slug,
        parentId,
        path,
        depth,
        sortOrder,
        status: 'active',
        isDeleted: false,
        deletedAt: null,
      },
      $setOnInsert: {
        description: `Shop ${node.name.toLowerCase()}.`,
      },
    },
    { upsert: true },
  );

  const doc = await CategoryModel.findOne({ slug: node.slug }).select('_id').lean();
  if (!doc?._id) throw new Error(`Failed to upsert category ${node.slug}`);
  return String(doc._id);
}

async function seedTree() {
  let sortOrder = 10;
  for (const root of OWNER_TREE) {
    const rootId = await upsertNode(root, null, '', 0, sortOrder++);
    if (!root.children?.length) continue;
    let childOrder = 0;
    for (const child of root.children) {
      const childId = await upsertNode(child, rootId, `/${root.slug}`, 1, childOrder++);
      if (!child.children?.length) continue;
      let grandOrder = 0;
      for (const grand of child.children) {
        await upsertNode(grand, childId, `/${root.slug}/${child.slug}`, 2, grandOrder++);
      }
    }
  }
  logger.info({ roots: OWNER_TREE.length }, 'Owner category tree upserted');
}

async function seedCampaigns() {
  for (const item of CAMPAIGN_CATEGORIES) {
    await CategoryModel.updateOne(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          parentId: null,
          path: `/${item.slug}`,
          depth: 0,
          sortOrder: item.sortOrder,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
        $setOnInsert: {
          description: `Shop ${item.name.toLowerCase()}.`,
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: CAMPAIGN_CATEGORIES.length }, 'Campaign categories ready');
}

async function archiveEverythingElse() {
  const keep = collectSlugs(OWNER_TREE);
  for (const item of CAMPAIGN_CATEGORIES) keep.add(item.slug);

  const result = await CategoryModel.updateMany(
    {
      slug: { $nin: [...keep] },
      isDeleted: false,
      status: { $ne: 'archived' },
    },
    {
      $set: {
        status: 'archived',
      },
    },
  );

  logger.info(
    { archived: result.modifiedCount, kept: keep.size },
    'Archived categories outside the owner catalog',
  );
}

async function remapWomenMegaMenuRoutes() {
  const menu = await NavigationMenuModel.findOne({ key: 'women', isDeleted: false });
  if (!menu) return;

  const remap: Record<string, string> = {
    'all-topwear': 'all-tops',
    'all-bottomwear': 'all-bottoms',
    jeans: 'jeans-denim',
    corset: 'corset-tops',
  };

  type MenuTile = {
    label?: string;
    slug?: string;
    imageUrl?: string;
    imageClassName?: string | null;
  };

  const mapTiles = (tiles: MenuTile[]) =>
    (tiles ?? []).map((tile) => {
      const slug = String(tile.slug ?? '');
      const nextSlug = remap[slug] ?? slug;
      let label = tile.label;
      if (slug === 'all-topwear' || label === 'All Topwear') label = 'All Tops';
      if (slug === 'all-bottomwear' || label === 'All Bottomwear') label = 'All Bottoms';
      return { ...tile, slug: nextSlug, label };
    });

  // `toObject()` flattens the tile sub-documents so they can be spread safely.
  const plain = menu.toObject() as unknown as { specials?: MenuTile[]; featured?: MenuTile[] };
  menu.set('specials', mapTiles(plain.specials ?? []));
  menu.set('featured', mapTiles(plain.featured ?? []));
  await menu.save();
  logger.info('Women mega-menu Specials / Shop the edit routes remapped');
}

async function main() {
  await connectDatabase();
  await seedTree();
  await seedCampaigns();
  await archiveEverythingElse();
  await remapWomenMegaMenuRoutes();
  await disconnectDatabase();
  logger.info('Owner category tree seed complete');
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Owner category tree seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
