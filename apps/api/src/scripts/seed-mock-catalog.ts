/**
 * Idempotent development seed for a complete storefront catalog.
 *
 * Usage:
 *   pnpm --filter @fe-platform/api exec tsx src/scripts/seed-mock-catalog.ts
 */
import { connectDatabase, disconnectDatabase, logger } from '@/config';
import {
  BrandModel,
  CategoryModel,
  CollectionModel,
  HeroBannerModel,
  HomeSectionModel,
  InventoryItemModel,
  ProductMediaModel,
  ProductModel,
  ProductVariantModel,
  PromoBannerModel,
  StoreSettingModel,
  WarehouseModel,
} from '@/models';

const image = (id: string, width = 1200, height = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=86`;

const categories = [
  ['Shirts', 'shirts', 'photo-1596755094514-f87e34085b2c'],
  ['Shoes', 'shoes', 'photo-1542291026-7eec264c27ff'],
  ['Jeans', 'jeans', 'photo-1542272454315-4c01d7abdf4a'],
  ['Perfumes', 'perfumes', 'photo-1541643600914-78b084683601'],
  ['T-Shirts', 't-shirts', 'photo-1521572163474-6864f9cf17ab'],
  ['Skirts', 'skirts', 'photo-1583496661160-fb5886a0aaaa'],
  ['Heels & Boots', 'heels-boots', 'photo-1543163521-1bf539c55dd2'],
  ['Sunglasses', 'sunglasses', 'photo-1511499767150-a48a237f0083'],
  ['Hoodies', 'hoodies', 'photo-1556821840-3a63f95609a7'],
  ['Oversized Tees', 'oversized-tees', 'photo-1576566588028-4147f3842f27'],
  ['Halloween Special', 'halloween-special', 'photo-1509551388413-e18d0ac5d495'],
  ['Women', 'women', 'photo-1483985988355-763728e1935b'],
  ['Men', 'men', 'photo-1617137968427-85924c800a22'],
  ['Accessories', 'accessories', 'photo-1523779917675-b6ed3a42a561'],
  ['Essentials', 'essentials', 'photo-1553062407-98eeb64c6a62'],
] as const;

const brands = [
  ['Atelier Studio', 'atelier-studio'],
  ['North & Loom', 'north-and-loom'],
  ['Forma', 'forma'],
] as const;

const products = [
  {
    name: 'Sienna Tailored Blazer',
    slug: 'sienna-tailored-blazer',
    category: 'women',
    brand: 'atelier-studio',
    price: 24900,
    salePrice: 21900,
    image: 'photo-1591047139829-d91aecb6caea',
    hover: 'photo-1551028719-00167b16eac5',
    color: 'Cocoa',
    flags: ['featured', 'trending', 'best'],
    description: 'A softly structured blazer cut with a modern relaxed line and refined tailoring.',
  },
  {
    name: 'Azure Pleated Midi Dress',
    slug: 'azure-pleated-midi-dress',
    category: 'women',
    brand: 'forma',
    price: 18500,
    image: 'photo-1566174053879-31528523f8ae',
    hover: 'photo-1595777457583-95e059d581b8',
    color: 'Azure',
    flags: ['featured', 'new'],
    description: 'Fluid pleats and a clean neckline create an effortless statement silhouette.',
  },
  {
    name: 'Oat Linen Co-ord Set',
    slug: 'oat-linen-coord-set',
    category: 'women',
    brand: 'north-and-loom',
    price: 16900,
    image: 'photo-1581044777550-4cfa60707c03',
    hover: 'photo-1551488831-00ddcb6c6bd3',
    color: 'Oat',
    flags: ['trending', 'new'],
    description: 'Breathable linen separates designed for warm days and polished layering.',
  },
  {
    name: 'Noir Sculpted Evening Dress',
    slug: 'noir-sculpted-evening-dress',
    category: 'women',
    brand: 'atelier-studio',
    price: 27900,
    image: 'photo-1566479179817-c0b5b4b4b1e5',
    hover: 'photo-1596783074918-c84cb06531ca',
    color: 'Noir',
    flags: ['best', 'featured'],
    description: 'A sculpted evening dress with a graceful drape and timeless black finish.',
  },
  {
    name: 'Harbour Relaxed Overshirt',
    slug: 'harbour-relaxed-overshirt',
    category: 'men',
    brand: 'north-and-loom',
    price: 14500,
    salePrice: 12500,
    image: 'photo-1610652492500-ded49ceeb378',
    hover: 'photo-1596755094514-f87e34085b2c',
    color: 'Harbour Blue',
    flags: ['trending', 'best'],
    description: 'A versatile heavyweight overshirt with clean utility detailing.',
  },
  {
    name: 'Stone Modern Chino',
    slug: 'stone-modern-chino',
    category: 'men',
    brand: 'forma',
    price: 11900,
    image: 'photo-1624378439575-d8705ad7ae80',
    hover: 'photo-1473966968600-fa801b869a1a',
    color: 'Stone',
    flags: ['new', 'featured'],
    description: 'Tapered stretch chinos balancing smart structure with everyday comfort.',
  },
  {
    name: 'Meridian Knit Polo',
    slug: 'meridian-knit-polo',
    category: 'men',
    brand: 'atelier-studio',
    price: 9800,
    image: 'photo-1583743814966-8936f37f884c',
    hover: 'photo-1602810318383-e386cc2a3ccf',
    color: 'Meridian Green',
    flags: ['best', 'new'],
    description: 'A fine-gauge knit polo with a modern open collar and rich seasonal color.',
  },
  {
    name: 'Everyday Premium Tee',
    slug: 'everyday-premium-tee',
    category: 'essentials',
    brand: 'north-and-loom',
    price: 5900,
    image: 'photo-1521572163474-6864f9cf17ab',
    hover: 'photo-1581655353564-df123a1eb820',
    color: 'Cloud',
    flags: ['best', 'trending'],
    description: 'A substantial organic-cotton tee with a refined neckline and easy fit.',
  },
  {
    name: 'Arc Leather Tote',
    slug: 'arc-leather-tote',
    category: 'accessories',
    brand: 'forma',
    price: 19800,
    image: 'photo-1548036328-c9fa89d128fa',
    hover: 'photo-1553062407-98eeb64c6a62',
    color: 'Cognac',
    flags: ['featured', 'trending'],
    description: 'A spacious architectural tote crafted in softly grained vegan leather.',
  },
  {
    name: 'Luna Minimal Watch',
    slug: 'luna-minimal-watch',
    category: 'accessories',
    brand: 'atelier-studio',
    price: 22900,
    image: 'photo-1524592094714-0f0654e20314',
    hover: 'photo-1523170335258-f5ed11844a49',
    color: 'Gold',
    flags: ['new', 'best'],
    description: 'A precise minimalist timepiece with a slim profile and polished metal finish.',
  },
  {
    name: 'Contour Sunglasses',
    slug: 'contour-sunglasses',
    category: 'accessories',
    brand: 'forma',
    price: 8900,
    salePrice: 6900,
    image: 'photo-1511499767150-a48a237f0083',
    hover: 'photo-1572635196237-14b3f281503f',
    color: 'Tortoise',
    flags: ['trending', 'new'],
    description: 'Sculptural frames with UV400 lenses and a softly oversized profile.',
  },
  {
    name: 'Cloud Studio Sneaker',
    slug: 'cloud-studio-sneaker',
    category: 'essentials',
    brand: 'north-and-loom',
    price: 15900,
    image: 'photo-1542291026-7eec264c27ff',
    hover: 'photo-1549298916-b41d501d3772',
    color: 'Cloud',
    flags: ['featured', 'best'],
    description: 'A clean low-profile sneaker built with cushioned comfort for every day.',
  },
] as const;

async function upsertMasterData() {
  const categoryDocs = new Map<string, any>();
  for (const [name, slug, imageId] of categories) {
    const doc = await CategoryModel.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          description: `Shop the latest ${name.toLowerCase()} edit.`,
          image: { url: image(imageId, 1000, 1000), alt: `${name} collection` },
          status: 'active',
          sortOrder: categoryDocs.size,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    );
    categoryDocs.set(slug, doc);
  }

  const brandDocs = new Map<string, any>();
  for (const [name, slug] of brands) {
    const doc = await BrandModel.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          description: `${name} — considered contemporary design.`,
          status: 'active',
          sortOrder: brandDocs.size,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    );
    brandDocs.set(slug, doc);
  }

  const collection = await CollectionModel.findOneAndUpdate(
    { slug: 'modern-edit' },
    {
      $set: {
        name: 'The Modern Edit',
        slug: 'modern-edit',
        description: 'Fresh colors, clean silhouettes, and elevated everyday pieces.',
        type: 'manual',
        heroImage: {
          url: image('photo-1496747611176-843222e1e57c', 1800, 1200),
          alt: 'The Modern Edit',
        },
        status: 'active',
        isDeleted: false,
        deletedAt: null,
      },
    },
    { upsert: true, new: true },
  );

  return { categoryDocs, brandDocs, collection };
}

async function seedProducts(
  categoryDocs: Map<string, any>,
  brandDocs: Map<string, any>,
  collection: any,
) {
  const warehouse = await WarehouseModel.findOneAndUpdate(
    { code: 'MAIN' },
    {
      $set: {
        name: 'Main Colombo Warehouse',
        code: 'MAIN',
        isDefault: true,
        priority: 1,
        status: 'active',
        isDeleted: false,
        deletedAt: null,
      },
    },
    { upsert: true, new: true },
  );

  const productIds = [];
  for (const [index, item] of products.entries()) {
    const flags = new Set<string>(item.flags);
    const product = await ProductModel.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          shortDescription: item.description,
          description: `<p>${item.description}</p><p>Designed for a modern wardrobe with quality materials and careful finishing.</p>`,
          categoryId: categoryDocs.get(item.category)?._id,
          brandId: brandDocs.get(item.brand)?._id,
          collectionIds: [collection._id],
          tags: [item.category, item.color.toLowerCase(), 'modern'],
          searchKeywords: [item.name, item.category, item.brand, item.color],
          gender: item.category === 'men' ? 'men' : item.category === 'women' ? 'women' : 'unisex',
          isFeatured: flags.has('featured'),
          isTrending: flags.has('trending'),
          isNewArrival: flags.has('new'),
          isBestSeller: flags.has('best'),
          status: 'active',
          visibility: 'public',
          publishAt: new Date(Date.now() - index * 86_400_000),
          pricing: {
            price: item.price,
            salePrice: 'salePrice' in item ? item.salePrice : null,
            compareAtPrice: 'salePrice' in item ? item.price : null,
            costPrice: Math.round(item.price * 0.48),
            currency: 'LKR',
          },
          specifications: [
            { name: 'Color', value: item.color, group: 'Details', sortOrder: 1 },
            { name: 'Care', value: 'Gentle care', group: 'Details', sortOrder: 2 },
          ],
          seo: {
            title: `${item.name} | FE`,
            description: item.description,
            ogImage: image(item.image),
          },
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    );

    const sku = `ATL-${String(index + 1).padStart(3, '0')}`;
    const variant = await ProductVariantModel.findOneAndUpdate(
      { sku },
      {
        $set: {
          productId: product._id,
          sku,
          barcode: `8901000${String(index + 1).padStart(5, '0')}`,
          title: `${item.name} — ${item.color}`,
          optionValues: { Color: item.color, Size: 'One Size' },
          price: item.price,
          salePrice: 'salePrice' in item ? item.salePrice : null,
          compareAtPrice: 'salePrice' in item ? item.price : null,
          costPrice: Math.round(item.price * 0.48),
          currency: 'LKR',
          thumbnailUrl: image(item.image),
          status: 'active',
          displayOrder: 0,
          isDefault: true,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    );

    const mediaRows = [
      { url: image(item.image), priority: 0, isPrimary: true, isThumbnail: true },
      { url: image(item.hover), priority: 1, isPrimary: false, isThumbnail: false },
    ];
    for (const media of mediaRows) {
      await ProductMediaModel.findOneAndUpdate(
        { productId: product._id, priority: media.priority },
        {
          $set: {
            productId: product._id,
            variantId: variant._id,
            type: 'image',
            ...media,
            thumbnailUrl: media.url,
            alt: item.name,
            mimeType: 'image/jpeg',
            width: 1200,
            height: 1600,
            isGallery: true,
            isDeleted: false,
            deletedAt: null,
          },
        },
        { upsert: true },
      );
    }

    await ProductModel.updateOne(
      { _id: product._id },
      { $set: { defaultVariantId: variant._id, variantCount: 1 } },
    );

    await InventoryItemModel.findOneAndUpdate(
      { warehouseId: warehouse._id, variantId: variant._id },
      {
        $set: {
          warehouseId: warehouse._id,
          variantId: variant._id,
          productId: product._id,
          sku,
          available: 18 + index,
          onHand: 18 + index,
          reserved: 0,
          incoming: 0,
          damaged: 0,
          returned: 0,
          safetyStock: 3,
          reorderPoint: 5,
          maximumStock: 60,
          unitCost: Math.round(item.price * 0.48),
          currency: 'LKR',
          stockStatus: 'in_stock',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );

    productIds.push(product._id);
  }

  await CollectionModel.updateOne({ _id: collection._id }, { $set: { productIds } });
}

async function seedHomepage() {
  const heroSlides = [
    {
      title: 'Color, cut, confidence.',
      subtitle: 'THE NEW MODERN EDIT · Expressive pieces designed for every version of you.',
      photo: 'photo-1496747611176-843222e1e57c',
      alt: 'Modern fashion collection',
      ctaLabel: 'Explore the edit',
      priority: 30,
    },
    {
      title: 'Quiet luxury, loud presence.',
      subtitle: 'ESSENTIAL LAYERING · Minimal silhouettes that still make an entrance.',
      photo: 'photo-1469334031218-e382a71b716b',
      alt: 'Quiet luxury fashion look',
      ctaLabel: 'Shop essentials',
      priority: 20,
    },
    {
      title: 'Weekend energy, elevated.',
      subtitle: 'OFF-DUTY EDIT · Easy pieces made for sunlit days and late nights.',
      photo: 'photo-1515886657613-9f3515b0c78f',
      alt: 'Weekend fashion edit',
      ctaLabel: 'Shop weekend',
      priority: 10,
    },
  ] as const;

  for (const slide of heroSlides) {
    const desktop = image(slide.photo, 2200, 1400);
    await HeroBannerModel.findOneAndUpdate(
      { title: slide.title },
      {
        $set: {
          title: slide.title,
          subtitle: slide.subtitle,
          images: {
            desktop: { url: desktop, alt: slide.alt },
            tablet: { url: desktop, alt: slide.alt },
            mobile: {
              url: image(slide.photo, 900, 1400),
              alt: slide.alt,
            },
          },
          ctaLabel: slide.ctaLabel,
          ctaUrl: '/products',
          priority: slide.priority,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }

  await HeroBannerModel.updateMany(
    { title: { $nin: heroSlides.map((slide) => slide.title) } },
    { $set: { status: 'inactive' } },
  );

  await PromoBannerModel.findOneAndUpdate(
    { placement: 'home' },
    {
      $set: {
        title: 'A brighter point of view',
        subtitle: 'Discover fresh tones and effortless shapes for the season ahead.',
        placement: 'home',
        images: {
          desktop: {
            url: image('photo-1445205170230-053b83016050', 2000, 900),
            alt: 'Seasonal collection',
          },
        },
        ctaLabel: 'Shop new arrivals',
        ctaUrl: '/products',
        priority: 1,
        status: 'active',
        isDeleted: false,
        deletedAt: null,
      },
    },
    { upsert: true },
  );

  const sections = [
    [
      'featured_categories',
      'Shop your mood',
      'Four edits, one unmistakably modern point of view.',
      'collection',
    ],
    [
      'trending_products',
      'Trending in color',
      'The pieces making the biggest impression right now.',
      'products',
    ],
    ['new_arrivals', 'Featured Categories', 'Shop the edits that define the season.', 'collection'],
    [
      'promotional_banner',
      'The modern edit',
      'Confident color meets refined everyday design.',
      'banners',
    ],
    [
      'trust_features',
      'Designed around you',
      'A seamless experience from discovery to delivery.',
      'custom',
    ],
    ['best_sellers', 'Shop categories', 'Hover a category to preview the edit.', 'custom'],
    [
      'newsletter',
      'Your front-row invitation',
      'New drops, private offers, and styling stories.',
      'custom',
    ],
  ] as const;

  for (const [index, [key, title, subtitle, type]] of sections.entries()) {
    await HomeSectionModel.findOneAndUpdate(
      { key },
      {
        $set: {
          key,
          title,
          subtitle,
          type,
          content: key === 'promotional_banner' ? { placement: 'home' } : {},
          sortOrder: index + 1,
          status: 'active',
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }
}

async function seedStoreSettings() {
  const settings = [
    ['store.name', 'FE', 'store'],
    ['storeName', 'FE', 'store'],
    ['store.tagline', 'Modern fashion for every day.', 'store'],
    ['seo.description', 'Shop the FE collection — modern fashion essentials.', 'seo'],
  ] as const;

  for (const [key, value, group] of settings) {
    await StoreSettingModel.findOneAndUpdate(
      { key },
      {
        $set: {
          key,
          value,
          type: 'string',
          group,
          isPublic: true,
          isDeleted: false,
          deletedAt: null,
        },
      },
      { upsert: true },
    );
  }
}

async function main() {
  await connectDatabase();
  await seedStoreSettings();
  const { categoryDocs, brandDocs, collection } = await upsertMasterData();
  await seedProducts(categoryDocs, brandDocs, collection);
  await seedHomepage();
  await disconnectDatabase();
  logger.info({ products: products.length }, 'Mock catalog and homepage seeded');
}

main().catch(async (error) => {
  logger.fatal({ err: error }, 'Mock catalog seed failed');
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
