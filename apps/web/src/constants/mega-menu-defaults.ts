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

export type MegaMenuLink = { label: string; slug: string };
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

const SHARED_BOTTOMWEAR: MegaMenuLink[] = [{ label: 'Jeans', slug: 'jeans' }];

const SHARED_WINTERWEAR: MegaMenuLink[] = [
  { label: 'Hoodies', slug: 'hoodies' },
  { label: 'Jackets', slug: 'jackets' },
];

export const DEFAULT_MEGA_MENUS: Record<NavigationMenuKey, GenderMegaMenuConfig> = {
  women: {
    key: 'women',
    label: 'Women',
    gender: 'women',
    columns: [
      {
        title: 'Topwear',
        links: [
          { label: 'All Topwear', slug: 'all-topwear' },
          ...SHARED_TOPWEAR,
          { label: 'Corset', slug: 'corset' },
        ],
      },
      {
        title: 'Bottomwear',
        links: [{ label: 'All Bottomwear', slug: 'all-bottomwear' }, ...SHARED_BOTTOMWEAR],
      },
      {
        title: 'Winterwear',
        links: [{ label: 'All Winterwear', slug: 'all-winterwear' }, ...SHARED_WINTERWEAR],
      },
    ],
    specials: [
      { label: 'New Arrival', slug: 'new-arrivals', imageUrl: newArrivalImage },
      { label: 'Oversized', slug: 'oversized', imageUrl: oversizedBanner },
      { label: 'Jeans', slug: 'jeans', imageUrl: jeansBanner },
      { label: 'Hoodies', slug: 'hoodies', imageUrl: hoodieImage },
      { label: 'Corset', slug: 'corset', imageUrl: corsetBanner },
      { label: 'Jackets', slug: 'jackets', imageUrl: jacketImage },
    ],
    featured: [
      {
        label: 'All Topwear',
        slug: 'all-topwear',
        imageUrl: allTopwearBanner,
        imageClassName: 'object-[70%_center]',
      },
      {
        label: 'All Bottomwear',
        slug: 'all-bottomwear',
        imageUrl: allBottomwearBanner,
        imageClassName: 'object-[72%_center]',
      },
      {
        label: 'Corset',
        slug: 'corset',
        imageUrl: corsetBanner,
        imageClassName: 'object-[68%_center]',
      },
      {
        label: 'Jeans',
        slug: 'jeans',
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
        title: 'Topwear',
        links: [{ label: 'All Topwear', slug: 'all-topwear' }, ...SHARED_TOPWEAR],
      },
      {
        title: 'Bottomwear',
        links: [{ label: 'All Bottomwear', slug: 'all-bottomwear' }, ...SHARED_BOTTOMWEAR],
      },
      {
        title: 'Winterwear',
        links: [{ label: 'All Winterwear', slug: 'all-winterwear' }, ...SHARED_WINTERWEAR],
      },
    ],
    specials: [
      { label: 'New Arrival', slug: 'new-arrivals', imageUrl: newArrivalImage },
      { label: 'Oversized', slug: 'oversized', imageUrl: oversizedBanner },
      { label: 'Jeans', slug: 'jeans', imageUrl: jeansBanner },
      { label: 'Hoodies', slug: 'hoodies', imageUrl: hoodieImage },
      { label: 'Shoes', slug: 'shoes', imageUrl: shoesImage },
      { label: 'Bags', slug: 'bags', imageUrl: bagsImage },
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
