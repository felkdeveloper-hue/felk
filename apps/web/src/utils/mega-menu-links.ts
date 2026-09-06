import { ROUTES } from '@/constants';
import type {
  BannerDevice,
  MegaMenuColumn,
  NavigationMenuKey,
} from '@/constants/mega-menu-defaults';

export function normalizeBannerDevice(value?: string | null): BannerDevice {
  if (value === 'desktop' || value === 'mobile') return value;
  return 'both';
}

export type CategoryPageBanner = {
  desktop?: string;
  mobile?: string;
  device: BannerDevice;
};

function linkSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/^\/?categories\//, '')
    .split('?')[0] ?? '';
}

/** Category PLP hero from mega-menu link banners — never homepage tile photos. */
export function findMegaMenuPageBanner(
  menus: Array<{ columns?: MegaMenuColumn[] } | null | undefined>,
  slug?: string | null,
): CategoryPageBanner | undefined {
  const normalized = slug ? linkSlug(slug) : '';
  if (!normalized) return undefined;

  for (const menu of menus) {
    for (const column of menu?.columns ?? []) {
      for (const link of column.links) {
        if (link.heading || linkSlug(link.slug) !== normalized) continue;
        const desktop = link.bannerUrl?.trim() || undefined;
        const mobile = link.bannerMobileUrl?.trim() || undefined;
        if (!desktop && !mobile) return undefined;
        return {
          desktop,
          mobile,
          device: normalizeBannerDevice(link.bannerDevice),
        };
      }
    }
  }
  return undefined;
}

export type MegaMenuLinkTarget =
  | { kind: 'products'; search: Record<string, string> }
  | { kind: 'category'; slug: string }
  | { kind: 'path'; to: string; search?: Record<string, string> };

function defaultGenderSearch(menuKey: NavigationMenuKey): Record<string, string> {
  if (menuKey === 'women' || menuKey === 'men') return { gender: menuKey };
  return {};
}

/**
 * Resolve the admin "route" field into a storefront destination.
 *
 * Supported values:
 * - `women` / `men` → /products?gender=…
 * - `jeans` → /categories/jeans
 * - `/categories/all-topwear` → exact path
 * - `/products?gender=women` or `products?gender=women` → path + query
 */
export function resolveMegaMenuLink(route: string, menuKey: NavigationMenuKey): MegaMenuLinkTarget {
  const raw = route.trim();
  if (!raw) {
    const search = defaultGenderSearch(menuKey);
    if (Object.keys(search).length) return { kind: 'products', search };
    return { kind: 'category', slug: 'accessories' };
  }

  const withSlash = raw.startsWith('/')
    ? raw
    : raw.includes('?') || raw.startsWith('products') || raw.startsWith('categories')
      ? `/${raw.replace(/^\//, '')}`
      : null;

  if (withSlash) {
    const [pathname = '', query = ''] = withSlash.split('?');
    const search = Object.fromEntries(new URLSearchParams(query).entries());
    if (pathname === ROUTES.products || pathname === '/products') {
      return {
        kind: 'products',
        search: Object.keys(search).length ? search : defaultGenderSearch(menuKey),
      };
    }
    const categoryMatch = pathname.match(/^\/categories\/([^/]+)\/?$/);
    if (categoryMatch?.[1]) {
      return { kind: 'category', slug: decodeURIComponent(categoryMatch[1]) };
    }
    return {
      kind: 'path',
      to: pathname || ROUTES.products,
      search: Object.keys(search).length ? search : undefined,
    };
  }

  if (raw === 'women' || raw === 'men') {
    return { kind: 'products', search: { gender: raw } };
  }

  return { kind: 'category', slug: raw };
}

export function megaMenuHrefPreview(route: string, menuKey: NavigationMenuKey): string {
  const target = resolveMegaMenuLink(route, menuKey);
  if (target.kind === 'products') {
    const qs = new URLSearchParams(target.search).toString();
    return qs ? `/products?${qs}` : '/products';
  }
  if (target.kind === 'category') return `/categories/${target.slug}`;
  const qs = target.search ? `?${new URLSearchParams(target.search).toString()}` : '';
  return `${target.to}${qs}`;
}
