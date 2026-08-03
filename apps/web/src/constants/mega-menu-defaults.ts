import allBottomwearBanner from '@/assets/images/Categories/all-bottomwear.webp';
import allTopwearBanner from '@/assets/images/Categories/all-topwear.webp';
import bagsImage from '@/assets/images/Categories/Bags.png';
import beltsImage from '@/assets/images/Categories/Belts.jpg';
import corsetBanner from '@/assets/images/Categories/corset-banner.webp';
import hoodieImage from '@/assets/images/Categories/Hoddiewomen.png';
import jeansBanner from '@/assets/images/Categories/jeans-banner.webp';
import jewelleryImage from '@/assets/images/Categories/Jewellery.jpg';
import newArrivalImage from '@/assets/images/Categories/New Arrival.png';
import oversizedBanner from '@/assets/images/Categories/oversized-banner.webp';
import scarvesImage from '@/assets/images/Categories/Scarves.jpg';
import shoesImage from '@/assets/images/Categories/Shoes.png';
import sunglassesImage from '@/assets/images/Categories/Sunglasses.jpg';
import jacketImage from '@/assets/images/Categories/WomenJacket.png';

/** Storefront mega-menu keys managed in admin. */
export type NavigationMenuKey = 'women' | 'men' | 'accessories';

/** @deprecated Use NavigationMenuKey */
export type MegaMenuGender = NavigationMenuKey;

export type MegaMenuLink = {
  label: string;
  slug: string;
  /** Non-clickable subheading inside a column (e.g. Pants under Bottoms). */
  heading?: boolean;
  /** Optional category page hero banner for this link. */
  bannerUrl?: string;
};
export type MegaMenuColumn = { title: string; links: MegaMenuLink[] };
export type MegaMenuTile = {
  label: string;
  slug: string;
  imageUrl: string;
  imageClassName?: string | null;
};

export type GenderMegaMenuConfig = {
  key: NavigationMenuKey;
  label: string;
  /** Optional gender shop context for women/men menus. */
  gender?: 'women' | 'men';
  columns: MegaMenuColumn[];
  specials: MegaMenuTile[];
  featured: MegaMenuTile[];
};

const SHARED_TOPWEAR: MegaMenuLink[] = [
  { label: 'Oversized', slug: 'oversized' },
  { label: 'New Arrivals', slug: 'new-arrivals' },
];

const SHARED_BOTTOMWEAR: MegaMenuLink[] = [{ label: 'Jeans', slug: 'jeans-denim' }];

/** Women text columns from the owner catalog — Specials / Shop the edit stay separate. */
export const WOMEN_CATEGORY_COLUMNS: MegaMenuColumn[] = [
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
      // Stacked under Co-ords to fill the empty column space; extra top gap via UI.
      { label: 'Footwear', slug: '', heading: true },
      { label: 'All footwear', slug: 'all-footwear' },
      { label: 'Heels', slug: 'heels' },
      { label: 'Slippers', slug: 'slippers' },
      { label: 'Shoes', slug: 'shoes' },
    ],
  },
];

/** True when a saved women menu still uses the old Topwear / Bottomwear / Winterwear columns. */
export function isLegacyWomenMegaMenuColumns(columns: MegaMenuColumn[]): boolean {
  if (!columns.length) return true;
  const titles = columns.map((column) => column.title.trim().toLowerCase());
  return (
    titles.includes('topwear') ||
    titles.includes('bottomwear') ||
    titles.includes('winterwear') ||
    // Pre-merge layout: Footwear as its own column left empty space under Co-ords.
    (titles.includes('co-ords') && titles.includes('footwear'))
  );
}

export const DEFAULT_MEGA_MENUS: Record<NavigationMenuKey, GenderMegaMenuConfig> = {
  women: {
    key: 'women',
    label: 'Women',
    gender: 'women',
    columns: WOMEN_CATEGORY_COLUMNS,
    specials: [
      { label: 'New Arrival', slug: 'new-arrivals', imageUrl: newArrivalImage },
      { label: 'Oversized', slug: 'oversized', imageUrl: oversizedBanner },
      { label: 'Jeans', slug: 'jeans-denim', imageUrl: jeansBanner },
      { label: 'Hoodies', slug: 'hoodies', imageUrl: hoodieImage },
      { label: 'Corset', slug: 'corset-tops', imageUrl: corsetBanner },
      { label: 'Jackets', slug: 'jackets', imageUrl: jacketImage },
    ],
    featured: [
      {
        label: 'All Tops',
        slug: 'all-tops',
        imageUrl: allTopwearBanner,
        imageClassName: 'object-[70%_center]',
      },
      {
        label: 'All Bottoms',
        slug: 'all-bottoms',
        imageUrl: allBottomwearBanner,
        imageClassName: 'object-[72%_center]',
      },
      {
        label: 'Corset',
        slug: 'corset-tops',
        imageUrl: corsetBanner,
        imageClassName: 'object-[68%_center]',
      },
      {
        label: 'Jeans',
        slug: 'jeans-denim',
        imageUrl: jeansBanner,
        imageClassName: 'object-[70%_center]',
      },
      {
        label: 'Oversized',
        slug: 'oversized',
        imageUrl: oversizedBanner,
        imageClassName: 'object-[75%_center]',
      },
    ],
  },
  men: {
    key: 'men',
    label: 'Men',
    gender: 'men',
    columns: [
      {
        title: 'Tops',
        links: [{ label: 'All Tops', slug: 'all-tops' }, ...SHARED_TOPWEAR],
      },
      {
        title: 'Bottoms',
        links: [{ label: 'All Bottoms', slug: 'all-bottoms' }, ...SHARED_BOTTOMWEAR],
      },
      {
        title: 'Footwear',
        links: [
          { label: 'All footwear', slug: 'all-footwear' },
          { label: 'Shoes', slug: 'shoes' },
        ],
      },
    ],
    specials: [
      { label: 'New Arrival', slug: 'new-arrivals', imageUrl: newArrivalImage },
      { label: 'Oversized', slug: 'oversized', imageUrl: oversizedBanner },
      { label: 'Jeans', slug: 'jeans-denim', imageUrl: jeansBanner },
      { label: 'Hoodies', slug: 'hoodies', imageUrl: hoodieImage },
      { label: 'Shoes', slug: 'shoes', imageUrl: shoesImage },
      { label: 'Jackets', slug: 'jackets', imageUrl: jacketImage },
    ],
    featured: [],
  },
  accessories: {
    key: 'accessories',
    label: 'Accessories',
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
      { label: 'Bags', slug: 'bags', imageUrl: bagsImage },
      { label: 'Shoes', slug: 'shoes', imageUrl: shoesImage },
      { label: 'Jewellery', slug: 'jewellery', imageUrl: jewelleryImage },
      { label: 'Belts', slug: 'belts', imageUrl: beltsImage },
      { label: 'Scarves', slug: 'scarves', imageUrl: scarvesImage },
      { label: 'Sunglasses', slug: 'sunglasses', imageUrl: sunglassesImage },
    ],
    featured: [
      {
        label: 'All Bags',
        slug: 'bags',
        imageUrl: bagsImage,
        imageClassName: 'object-center',
      },
      {
        label: 'All Shoes',
        slug: 'shoes',
        imageUrl: shoesImage,
        imageClassName: 'object-center',
      },
      {
        label: 'Jewellery',
        slug: 'jewellery',
        imageUrl: newArrivalImage,
        imageClassName: 'object-center',
      },
      {
        label: 'Belts',
        slug: 'belts',
        imageUrl: jeansBanner,
        imageClassName: 'object-center',
      },
      {
        label: 'Scarves',
        slug: 'scarves',
        imageUrl: hoodieImage,
        imageClassName: 'object-center',
      },
    ],
  },
};
