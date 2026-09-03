import allBottomwearBanner from '@/assets/images/Categories/all-bottomwear.webp';
import corsetBanner from '@/assets/images/Categories/corset-banner.webp';
import hoodieImage from '@/assets/images/Categories/Hoddiewomen.png';
import shoesImage from '@/assets/images/Categories/Shoes.png';
import topsImage from '@/assets/images/Crousel Image/tops.webp';
import bottomsImage from '@/assets/images/Crousel Image/bottoms.webp';
import ethnicWearImage from '@/assets/images/Crousel Image/EthenicWear.webp';
import shopForLookImage from '@/assets/images/Crousel Image/shop-for-look.webp';

export type HomeCategoryNavItem = {
  label: string;
  slug: string;
  imageUrl: string;
  imageClassName?: string;
};

/**
 * Homepage Categories grid + mobile drawer CATEGORIES tab.
 * Labels/slugs must stay in sync — same destinations as the hamburger menu.
 * Images are local bundles / public assets so they load on localhost.
 */
export const HOME_CATEGORY_NAV_ITEMS: ReadonlyArray<HomeCategoryNavItem> = [
  {
    label: 'TOPS',
    slug: 'all-tops',
    imageUrl: topsImage,
    imageClassName: 'object-[70%_center]',
  },
  {
    label: 'PANTS',
    slug: 'pants',
    imageUrl: bottomsImage,
    imageClassName: 'object-[72%_center]',
  },
  {
    label: 'DRESSES',
    slug: 'all-dresses',
    imageUrl: ethnicWearImage,
    imageClassName: 'object-center',
  },
  {
    label: 'SKIRTS',
    slug: 'skirts',
    imageUrl: allBottomwearBanner,
    imageClassName: 'object-[center_35%]',
  },
  {
    label: 'RESORT WEAR',
    slug: 'resort-wear',
    imageUrl: shopForLookImage,
    imageClassName: 'object-center',
  },
  {
    label: 'SWEATERS',
    slug: 'sweater',
    imageUrl: hoodieImage,
    imageClassName: 'object-center',
  },
  {
    label: 'MATCHING SETS',
    slug: 'matching-sets',
    imageUrl: corsetBanner,
    imageClassName: 'object-[center_22%]',
  },
  {
    label: 'SHOES',
    slug: 'shoes',
    imageUrl: shoesImage,
    imageClassName: 'object-center',
  },
];

const HOME_CATEGORY_SLUG_SET = new Set(
  HOME_CATEGORY_NAV_ITEMS.map((item) => item.slug.toLowerCase()),
);

/**
 * Sidebar / homepage category tiles keep their own banners.
 * Any other category (e.g. filter picks like Mini Dresses) uses the default shop banner.
 */
export function isHomeCategoryNavSlug(slug: string | undefined | null): boolean {
  if (!slug) return false;
  return HOME_CATEGORY_SLUG_SET.has(slug.trim().toLowerCase());
}

/** Local tile/banner art for one of the eight homepage category destinations. */
export function getHomeCategoryNavItem(slug: string | undefined | null) {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  return HOME_CATEGORY_NAV_ITEMS.find((item) => item.slug.toLowerCase() === normalized);
}
