import { FE_BASICS_NAME, FE_BASICS_SLUG, isFeBasicsSlug } from '@/constants/fe-basics';
import allBottomwearBanner from '@/assets/images/Categories/all-bottomwear.webp';
import hoodieImage from '@/assets/images/Categories/Hoddiewomen.png';
import corsetBanner from '@/assets/images/Categories/corset-banner.webp';
import shoesImage from '@/assets/images/Categories/Shoes.png';
import topsImage from '@/assets/images/Crousel Image/tops.webp';
import bottomsImage from '@/assets/images/Crousel Image/bottoms.webp';
import ethnicWearImage from '@/assets/images/Crousel Image/EthenicWear.webp';
import shopForLookImage from '@/assets/images/Crousel Image/shop-for-look.webp';

export type HomeCategoryNavItem = {
  label: string;
  slug: string;
  imageUrl: string;
  imageClassName?: string | null;
  highlight?: boolean;
};

type HomeCategoryTileLike = Pick<HomeCategoryNavItem, 'label' | 'slug' | 'imageUrl' | 'imageClassName'>;

/**
 * Older admin Mega menu tiles (New Arrival / Jeans / Oversized).
 * The shop Categories grid the owner designed is TOPS / PANTS / DRESSES / …
 */
const STALE_ADMIN_HOME_CATEGORY_SLUGS = new Set([
  'new-arrivals',
  'new-arrival',
  'jeans-denim',
  'jeans',
  'oversized',
  'corset-tops',
  'corset',
  'hoodies',
  'jackets',
  'bags',
]);

export const FE_BASICS_NAV_ITEM: HomeCategoryNavItem = {
  label: FE_BASICS_NAME,
  slug: FE_BASICS_SLUG,
  imageUrl: shopForLookImage,
  imageClassName: 'object-[55%_center]',
  highlight: true,
};

/**
 * Homepage Categories grid + mobile drawer CATEGORIES tab + admin tile editor.
 * CMS uploads override these images; labels/slugs stay this designed set.
 */
export const HOME_CATEGORY_NAV_ITEMS: ReadonlyArray<HomeCategoryNavItem> = [
  FE_BASICS_NAV_ITEM,
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

/** Unique shop-grid slugs — `shoes` also existed on the old admin tile list. */
const DESIGNED_HOME_CATEGORY_MARKERS = new Set([
  FE_BASICS_SLUG,
  'all-tops',
  'pants',
  'all-dresses',
  'skirts',
  'resort-wear',
  'sweater',
  'matching-sets',
]);

function normalizeHomeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Pin FE Basics first so factory-made pieces stay the lead category even if CMS tiles omit it. */
export function ensureFeBasicsHomeTiles<T extends HomeCategoryTileLike>(tiles: T[]): T[] {
  const featured = {
    label: FE_BASICS_NAV_ITEM.label,
    slug: FE_BASICS_NAV_ITEM.slug,
    imageUrl: FE_BASICS_NAV_ITEM.imageUrl,
    imageClassName: FE_BASICS_NAV_ITEM.imageClassName,
  } as T;
  const existing = tiles.find((tile) => isFeBasicsSlug(tile.slug));
  const rest = tiles.filter((tile) => !isFeBasicsSlug(tile.slug));
  if (!existing) return [{ ...featured }, ...rest];
  return [
    {
      ...featured,
      ...existing,
      label: existing.label.trim() || featured.label,
      slug: FE_BASICS_SLUG,
      imageUrl: existing.imageUrl.trim() || featured.imageUrl,
      imageClassName: existing.imageClassName ?? featured.imageClassName,
    },
    ...rest,
  ];
}

/**
 * Sidebar / homepage category tiles keep their own banners.
 * Any other category (e.g. filter picks like Mini Dresses) uses the default shop banner.
 */
export function isHomeCategoryNavSlug(
  slug: string | undefined | null,
  extraSlugs?: ReadonlyArray<string | undefined | null>,
): boolean {
  if (!slug) return false;
  const normalized = normalizeHomeCategorySlug(slug);
  if (HOME_CATEGORY_SLUG_SET.has(normalized)) return true;
  return (
    extraSlugs?.some((item) => item && normalizeHomeCategorySlug(item) === normalized) ?? false
  );
}

/** True when CMS still stores the old New Arrival / Jeans / Oversized admin tiles. */
export function isLegacyHomeCategoryList(
  tiles?: ReadonlyArray<{ slug?: string | null }> | null,
): boolean {
  if (!tiles?.length) return false;
  const slugs = tiles.map((tile) => String(tile.slug ?? '').toLowerCase());
  const hasDesignedTiles = slugs.some((slug) => DESIGNED_HOME_CATEGORY_MARKERS.has(slug));
  if (hasDesignedTiles) return false;
  const staleHits = slugs.filter((slug) => STALE_ADMIN_HOME_CATEGORY_SLUGS.has(slug)).length;
  return staleHits >= 2;
}

/** Local tile/banner art for one of the homepage category destinations. */
export function getHomeCategoryNavItem(
  slug: string | undefined | null,
  extraItems?: ReadonlyArray<HomeCategoryTileLike>,
) {
  if (!slug) return undefined;
  const normalized = normalizeHomeCategorySlug(slug);
  const fromCms = extraItems?.find((item) => normalizeHomeCategorySlug(item.slug) === normalized);
  const bundled = HOME_CATEGORY_NAV_ITEMS.find((item) => item.slug.toLowerCase() === normalized);
  if (fromCms) {
    return {
      label: fromCms.label,
      slug: fromCms.slug,
      imageUrl: fromCms.imageUrl.trim() || bundled?.imageUrl || '',
      imageClassName: fromCms.imageClassName ?? bundled?.imageClassName,
    };
  }
  return bundled;
}

/** Prefer CMS homepage tiles from admin; fall back to the designed shop tiles. */
export function resolveHomeCategoryTiles(
  cmsTiles?: ReadonlyArray<HomeCategoryTileLike> | null,
): HomeCategoryNavItem[] {
  const tiles = (cmsTiles ?? []).filter((tile) => tile.label.trim() && tile.slug.trim());
  if (!tiles.length || isLegacyHomeCategoryList(tiles)) {
    return HOME_CATEGORY_NAV_ITEMS.map((tile) => ({ ...tile }));
  }

  return ensureFeBasicsHomeTiles(
    tiles.map((tile) => {
      const fallback = getHomeCategoryNavItem(tile.slug);
      return {
        label: tile.label.trim(),
        slug: tile.slug.trim(),
        imageUrl: tile.imageUrl.trim() || fallback?.imageUrl || '',
        imageClassName: tile.imageClassName ?? fallback?.imageClassName,
        highlight: isFeBasicsSlug(tile.slug) || fallback?.highlight,
      };
    }),
  ).map((tile) => ({
    ...tile,
    highlight: isFeBasicsSlug(tile.slug) ? true : tile.highlight,
  }));
}
