/**
 * Seed rich filter master data + accessory categories + accessories mega menu.
 *
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/seed-filter-options.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import { NavigationMenuModel } from '@/models/cms-content.models';
import {
  CategoryModel,
  ColorModel,
  MaterialModel,
  OccasionModel,
  SizeModel,
} from '@/models/master-data.models';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Off White', hex: '#F5F5F0' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Tan', hex: '#D2B48C' },
  { name: 'Camel', hex: '#C19A6B' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Navy', hex: '#001F3F' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Sky Blue', hex: '#87CEEB' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Green', hex: '#228B22' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Mint', hex: '#98FF98' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Mustard', hex: '#E1AD01' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Hot Pink', hex: '#FF69B4' },
  { name: 'Blush', hex: '#DE5D83' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Gold', hex: '#D4AF37' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Rose Gold', hex: '#B76E79' },
  { name: 'Multi', hex: '#A855F7' },
];

const FABRICS = [
  'Cotton',
  'Organic Cotton',
  'Denim',
  'Linen',
  'Silk',
  'Satin',
  'Chiffon',
  'Georgette',
  'Crepe',
  'Rayon',
  'Viscose',
  'Polyester',
  'Nylon',
  'Wool',
  'Cashmere',
  'Knit',
  'Jersey',
  'Fleece',
  'Velvet',
  'Corduroy',
  'Tweed',
  'Lace',
  'Mesh',
  'Leather',
  'Faux Leather',
  'Suede',
  'Modal',
  'Tencel',
  'Bamboo',
  'Spandex Blend',
];

const OCCASIONS = [
  'Casual',
  'Everyday',
  'Work',
  'Office',
  'Party',
  'Evening',
  'Date Night',
  'Wedding',
  'Festive',
  'Holiday',
  'Travel',
  'Beach',
  'Resort',
  'Brunch',
  'Sport',
  'Athleisure',
  'Lounge',
  'Formal',
  'Semi Formal',
  'Cocktail',
];

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'];

const CATEGORIES: Array<{ name: string; slug: string; sortOrder: number }> = [
  // Deprecated flat list — category hierarchy is seeded by
  // `src/scripts/seed-owner-category-tree.ts`. Kept empty so this script
  // cannot resurrect old topwear / accessories options.
];

const ACCESSORIES_MENU = {
  key: 'accessories' as const,
  label: 'Accessories',
  gender: 'accessories' as const,
  columns: [
    {
      title: 'Bags',
      links: [
        { label: 'All Bags', slug: 'bags' },
        { label: 'Handbags', slug: 'handbags' },
        { label: 'Tote Bags', slug: 'tote-bags' },
        { label: 'Crossbody', slug: 'crossbody-bags' },
        { label: 'Clutches', slug: 'clutches' },
      ],
    },
    {
      title: 'Footwear',
      links: [
        { label: 'All Shoes', slug: 'shoes' },
        { label: 'Heels', slug: 'heels' },
        { label: 'Flats', slug: 'flats' },
        { label: 'Sneakers', slug: 'sneakers' },
        { label: 'Boots', slug: 'boots' },
      ],
    },
    {
      title: 'Jewellery',
      links: [
        { label: 'All Jewellery', slug: 'jewellery' },
        { label: 'Earrings', slug: 'earrings' },
        { label: 'Necklaces', slug: 'necklaces' },
        { label: 'Bracelets', slug: 'bracelets' },
        { label: 'Rings', slug: 'rings' },
      ],
    },
    {
      title: 'Essentials',
      links: [
        { label: 'Belts', slug: 'belts' },
        { label: 'Scarves', slug: 'scarves' },
        { label: 'Sunglasses', slug: 'sunglasses' },
        { label: 'Hair Accessories', slug: 'hair-accessories' },
        { label: 'Watches', slug: 'watches' },
      ],
    },
  ],
  specials: [
    { label: 'Bags', slug: 'bags', imageUrl: '', imageClassName: null },
    { label: 'Shoes', slug: 'shoes', imageUrl: '', imageClassName: null },
    { label: 'Jewellery', slug: 'jewellery', imageUrl: '', imageClassName: null },
    { label: 'Belts', slug: 'belts', imageUrl: '', imageClassName: null },
    { label: 'Scarves', slug: 'scarves', imageUrl: '', imageClassName: null },
    { label: 'Sunglasses', slug: 'sunglasses', imageUrl: '', imageClassName: null },
  ],
  featured: [
    { label: 'All Bags', slug: 'bags', imageUrl: '', imageClassName: null },
    { label: 'All Shoes', slug: 'shoes', imageUrl: '', imageClassName: null },
    { label: 'Jewellery', slug: 'jewellery', imageUrl: '', imageClassName: null },
    { label: 'Belts', slug: 'belts', imageUrl: '', imageClassName: null },
    { label: 'Scarves', slug: 'scarves', imageUrl: '', imageClassName: null },
  ],
  status: 'active',
};

async function upsertCategories() {
  if (!CATEGORIES.length) {
    logger.info(
      'Skipping flat category seed — run seed-owner-category-tree.ts for the owner hierarchy',
    );
    return;
  }
  for (const item of CATEGORIES) {
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
          description: `Shop ${item.name}.`,
          parentId: null,
          filterFacetKeys: [],
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: CATEGORIES.length }, 'Categories ready');
}

async function upsertColors() {
  for (const [index, color] of COLORS.entries()) {
    const slug = slugify(color.name);
    const code = slug.toUpperCase().replace(/-/g, '_');
    await ColorModel.updateOne(
      { slug },
      {
        $set: {
          name: color.name,
          slug,
          code,
          hex: color.hex,
          sortOrder: index,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: COLORS.length }, 'Colors ready');
}

async function upsertFabrics() {
  for (const [index, name] of FABRICS.entries()) {
    const slug = slugify(name);
    const code = slug.toUpperCase().replace(/-/g, '_');
    await MaterialModel.updateOne(
      { slug },
      {
        $set: {
          name,
          slug,
          code,
          sortOrder: index,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: FABRICS.length }, 'Fabrics (materials) ready');
}

async function upsertOccasions() {
  for (const [index, name] of OCCASIONS.entries()) {
    const slug = slugify(name);
    await OccasionModel.updateOne(
      { slug },
      {
        $set: {
          name,
          slug,
          sortOrder: index,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: OCCASIONS.length }, 'Occasions ready');
}

async function upsertSizes() {
  for (const [index, name] of SIZES.entries()) {
    const slug = slugify(name);
    await SizeModel.updateOne(
      { slug },
      {
        $set: {
          name,
          slug,
          code: name,
          sortOrder: index,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }
  logger.info({ count: SIZES.length }, 'Sizes ready');
}

async function upsertAccessoriesMenu() {
  await NavigationMenuModel.findOneAndUpdate(
    { key: 'accessories' },
    {
      $set: {
        ...ACCESSORIES_MENU,
        isDeleted: false,
        deletedAt: null,
      },
    },
    { upsert: true, new: true },
  );
  logger.info('Accessories mega menu saved');
}

async function main() {
  await connectDatabase();
  await upsertCategories();
  await upsertColors();
  await upsertFabrics();
  await upsertOccasions();
  await upsertSizes();
  await upsertAccessoriesMenu();
  logger.info('Filter options + accessories mega menu seed complete');
}

main()
  .catch((error) => {
    logger.error(error, 'seed-filter-options failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
