import { http } from '@/lib/http-client';
import type {
  GenderMegaMenuConfig,
  MegaMenuColumn,
  MegaMenuGender,
  MegaMenuTile,
} from '@/constants/mega-menu-defaults';
import { DEFAULT_MEGA_MENUS } from '@/constants/mega-menu-defaults';

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
          return { label: String(row.label ?? ''), slug: String(row.slug ?? '') };
        })
      : [];
    return { title: String(record.title ?? ''), links };
  });
}

export const navigationMenusApi = {
  async getByKey(key: MegaMenuGender): Promise<GenderMegaMenuConfig> {
    try {
      const raw = await http.get<Record<string, unknown>>(`/storefront/navigation-menus/${key}`);
      const columns = asColumns(raw.columns);
      const specials = asTiles(raw.specials);
      const featured = asTiles(raw.featured);
      const fallback = DEFAULT_MEGA_MENUS[key];
      return {
        key,
        label: String(raw.label ?? fallback.label),
        gender: key === 'women' || key === 'men' ? key : undefined,
        columns: columns.length ? columns : fallback.columns,
        specials: specials.length ? specials : fallback.specials,
        featured: featured.length ? featured : fallback.featured,
      };
    } catch {
      // Avoid structuredClone — Vite asset URL modules are plain strings, but
      // a shallow copy is enough and safer across browsers.
      return {
        ...DEFAULT_MEGA_MENUS[key],
        columns: DEFAULT_MEGA_MENUS[key].columns.map((column) => ({
          ...column,
          links: column.links.map((link) => ({ ...link })),
        })),
        specials: DEFAULT_MEGA_MENUS[key].specials.map((tile) => ({ ...tile })),
        featured: DEFAULT_MEGA_MENUS[key].featured.map((tile) => ({ ...tile })),
      };
    }
  },
};
