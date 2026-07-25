import { http } from '@/lib/http-client';
import type {
  GenderMegaMenuConfig,
  MegaMenuColumn,
  MegaMenuGender,
  MegaMenuTile,
} from '@/constants/mega-menu-defaults';
import { DEFAULT_MEGA_MENUS, isLegacyWomenMegaMenuColumns } from '@/constants/mega-menu-defaults';

/**
 * Mega-menu tiles saved from local Vite admin often persist `/src/assets/...`
 * paths. Those only work in `vite dev` and 404 on Vercel. Prefer bundled
 * hashed asset URLs from DEFAULT_MEGA_MENUS whenever the CMS URL is unusable.
 */
function isUsableStorefrontImageUrl(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith('/src/')) return false;
  if (value.startsWith('/@fs/') || value.includes('/node_modules/')) return false;
  // Absolute http(s) (R2/CDN/Unsplash) or Vite-built `/assets/<hash>.*` are fine.
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith('/assets/')) return true;
  if (value.startsWith('data:') || value.startsWith('blob:')) return true;
  return false;
}

function asTiles(raw: unknown): MegaMenuTile[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      label: String(record.label ?? ''),
      slug: String(record.slug ?? ''),
      imageUrl: String(record.imageUrl ?? ''),
      imageClassName: typeof record.imageClassName === 'string' ? record.imageClassName : null,
    };
  });
}

function asColumns(raw: unknown): MegaMenuColumn[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const record = item as Record<string, unknown>;
    const links = Array.isArray(record.links)
      ? record.links.map((link) => {
          const row = link as Record<string, unknown>;
          return {
            label: String(row.label ?? ''),
            slug: String(row.slug ?? ''),
            ...(row.heading ? { heading: true as const } : {}),
          };
        })
      : [];
    return { title: String(record.title ?? ''), links };
  });
}

function mergeTilesWithFallback(
  cmsTiles: MegaMenuTile[],
  fallback: MegaMenuTile[],
): MegaMenuTile[] {
  if (!cmsTiles.length) {
    return fallback.map((tile) => ({ ...tile }));
  }

  return cmsTiles.map((tile, index) => {
    const bySlug = fallback.find((item) => item.slug === tile.slug);
    const byIndex = fallback[index];
    const fallbackTile = bySlug ?? byIndex;
    const imageUrl = isUsableStorefrontImageUrl(tile.imageUrl)
      ? tile.imageUrl.trim()
      : (fallbackTile?.imageUrl ?? '');

    return {
      label: tile.label || fallbackTile?.label || '',
      slug: tile.slug || fallbackTile?.slug || '',
      imageUrl,
      imageClassName: tile.imageClassName ?? fallbackTile?.imageClassName ?? null,
    };
  });
}

function cloneDefaultMenu(key: MegaMenuGender): GenderMegaMenuConfig {
  const source = DEFAULT_MEGA_MENUS[key];
  return {
    ...source,
    columns: source.columns.map((column) => ({
      ...column,
      links: column.links.map((link) => ({ ...link })),
    })),
    specials: source.specials.map((tile) => ({ ...tile })),
    featured: source.featured.map((tile) => ({ ...tile })),
  };
}

export const navigationMenusApi = {
  async getByKey(key: MegaMenuGender): Promise<GenderMegaMenuConfig> {
    try {
      const raw = await http.get<Record<string, unknown>>(`/storefront/navigation-menus/${key}`);
      const columns = asColumns(raw.columns);
      const specials = asTiles(raw.specials);
      const featured = asTiles(raw.featured);
      const fallback = DEFAULT_MEGA_MENUS[key];
      // Keep CMS Specials / Shop the edit, but replace the old Topwear columns
      // with the owner catalog so a previously saved women menu does not hide it.
      const resolvedColumns =
        key === 'women' && isLegacyWomenMegaMenuColumns(columns)
          ? fallback.columns.map((column) => ({
              ...column,
              links: column.links.map((link) => ({ ...link })),
            }))
          : columns.length
            ? columns
            : fallback.columns;
      return {
        key,
        label: String(raw.label ?? fallback.label),
        gender: key === 'women' || key === 'men' ? key : undefined,
        columns: resolvedColumns,
        specials: mergeTilesWithFallback(specials, fallback.specials),
        featured: mergeTilesWithFallback(featured, fallback.featured),
      };
    } catch {
      return cloneDefaultMenu(key);
    }
  },
};
