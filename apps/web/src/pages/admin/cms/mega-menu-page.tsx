import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AdminPageHeader, AdminPanel, PageMotion } from '@/components/admin';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DEFAULT_HOME_CATEGORIES,
  DEFAULT_MEGA_MENUS,
  ensureWomenCoordsExtras,
  isLegacyWomenMegaMenuColumns,
  type GenderMegaMenuConfig,
  type MegaMenuColumn,
  type MegaMenuGender,
  type MegaMenuLink,
  type MegaMenuTile,
} from '@/constants/mega-menu-defaults';
import { AppError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { cmsApi } from '@/services/sdk/admin';
import { megaMenuHrefPreview } from '@/utils/mega-menu-links';

const fieldClassName =
  'w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)] outline-none transition-colors focus:border-[var(--admin-accent)]/50';

function emptyLink(): MegaMenuLink {
  return { label: '', slug: '', bannerUrl: '' };
}

function emptyHeading(): MegaMenuLink {
  return { label: '', slug: '', heading: true };
}

function emptyTile(): MegaMenuTile {
  return { label: '', slug: '', imageUrl: '' };
}

function emptyColumn(): MegaMenuColumn {
  return { title: '', links: [emptyLink()] };
}

function normalizeConfig(
  key: MegaMenuGender,
  raw: Record<string, unknown> | null | undefined,
): GenderMegaMenuConfig {
  const fallback = DEFAULT_MEGA_MENUS[key];
  if (!raw) return structuredClone(fallback);

  const parsedColumns = Array.isArray(raw.columns)
    ? (raw.columns as MegaMenuColumn[]).map((col) => ({
        title: String(col.title ?? ''),
        links: Array.isArray(col.links)
          ? col.links.map((link) => ({
              label: String(link.label ?? ''),
              slug: String(link.slug ?? ''),
              ...(link.heading ? { heading: true as const } : {}),
              bannerUrl: String(link.bannerUrl ?? ''),
            }))
          : [],
      }))
    : fallback.columns;

  const baseColumns =
    key === 'women' && isLegacyWomenMegaMenuColumns(parsedColumns)
      ? structuredClone(fallback.columns)
      : parsedColumns.length
        ? parsedColumns
        : fallback.columns;

  const columns = key === 'women' ? ensureWomenCoordsExtras(baseColumns) : baseColumns;

  const mapTiles = (tiles: unknown, fallbackTiles: MegaMenuTile[]): MegaMenuTile[] => {
    if (!Array.isArray(tiles)) return fallbackTiles;
    return (tiles as MegaMenuTile[]).map((tile, index) => {
      const rawUrl = String(tile.imageUrl ?? '').trim();
      // Vite `/src/...` paths only work in local `vite` — never persist/show them in admin.
      const imageUrl =
        rawUrl && !rawUrl.startsWith('/src/') && !rawUrl.includes('/src/assets/')
          ? rawUrl
          : String(fallbackTiles[index]?.imageUrl ?? '');
      return {
        label: String(tile.label ?? fallbackTiles[index]?.label ?? ''),
        slug: String(tile.slug ?? fallbackTiles[index]?.slug ?? ''),
        imageUrl,
        imageClassName:
          typeof tile.imageClassName === 'string'
            ? tile.imageClassName
            : (tile.imageClassName ?? fallbackTiles[index]?.imageClassName ?? null),
      };
    });
  };

  const rawHero = String(raw.heroBannerUrl ?? '').trim();
  const heroBannerUrl =
    rawHero && !rawHero.startsWith('/src/') && !rawHero.includes('/src/assets/')
      ? rawHero
      : String(fallback.heroBannerUrl ?? '');

  const homeFallback =
    fallback.homeCategories?.length || key !== 'women'
      ? (fallback.homeCategories ?? [])
      : DEFAULT_HOME_CATEGORIES;

  return {
    key,
    label: String(raw.label ?? fallback.label),
    gender: key === 'women' || key === 'men' ? key : undefined,
    heroBannerUrl,
    columns: columns.length ? columns : fallback.columns,
    specials: mapTiles(raw.specials, fallback.specials),
    featured: mapTiles(raw.featured, fallback.featured),
    homeCategories: mapTiles(raw.homeCategories, homeFallback),
  };
}

function MegaMenuEditor({ menuKey }: { menuKey: MegaMenuGender }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<
    | { kind: 'specials' | 'featured' | 'homeCategories'; index: number }
    | { kind: 'linkBanner'; columnIndex: number; linkIndex: number }
    | { kind: 'heroBanner' }
    | null
  >(null);
  const [config, setConfig] = useState<GenderMegaMenuConfig>(() =>
    structuredClone(DEFAULT_MEGA_MENUS[menuKey]),
  );

  const query = useQuery({
    queryKey: ['cms', 'navigation-menus', menuKey],
    queryFn: () => cmsApi.navigationMenus.getByKey(menuKey),
    retry: false,
  });

  useEffect(() => {
    setConfig(normalizeConfig(menuKey, query.data as Record<string, unknown> | null));
  }, [menuKey, query.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      cmsApi.navigationMenus.upsert(menuKey, {
        label: config.label.trim() || DEFAULT_MEGA_MENUS[menuKey].label,
        gender: menuKey,
        heroBannerUrl: config.heroBannerUrl?.trim() || '',
        columns: config.columns
          .map((col) => ({
            title: col.title.trim(),
            links: col.links
              .map((link) => ({
                label: link.label.trim(),
                slug: link.slug.trim(),
                ...(link.heading ? { heading: true as const } : {}),
                bannerUrl: link.bannerUrl?.trim() || '',
              }))
              .filter((link) => link.label && (link.heading || link.slug)),
          }))
          .filter((col) => col.title),
        specials: config.specials
          .map((tile) => ({
            label: tile.label.trim(),
            slug: tile.slug.trim(),
            imageUrl: tile.imageUrl.trim(),
            imageClassName: tile.imageClassName ?? null,
          }))
          .filter((tile) => tile.label && tile.slug),
        featured: config.featured
          .map((tile) => ({
            label: tile.label.trim(),
            slug: tile.slug.trim(),
            imageUrl: tile.imageUrl.trim(),
            imageClassName: tile.imageClassName ?? null,
          }))
          .filter((tile) => tile.label && tile.slug),
        homeCategories: (config.homeCategories ?? [])
          .map((tile) => ({
            label: tile.label.trim(),
            slug: tile.slug.trim(),
            imageUrl: tile.imageUrl.trim(),
            imageClassName: tile.imageClassName ?? null,
          }))
          .filter((tile) => tile.label && tile.slug),
        status: 'active',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cms', 'navigation-menus', menuKey] });
      void queryClient.invalidateQueries({ queryKey: ['storefront', 'navigation-menus'] });
      toast.success(`${config.label || menuKey} mega menu saved`);
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to save mega menu');
    },
  });

  const uploadTileImage = async (
    file: File,
    kind: 'specials' | 'featured' | 'homeCategories',
    index: number,
  ) => {
    try {
      const uploaded = await cmsApi.navigationMenus.uploadMedia(file, {
        kind: kind === 'homeCategories' ? 'tile' : 'tile',
      });
      setConfig((prev) => {
        const next = structuredClone(prev);
        const list = next[kind] ?? [];
        const current = list[index] ?? emptyTile();
        list[index] = { ...current, imageUrl: uploaded.url };
        next[kind] = list;
        return next;
      });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Upload failed');
    }
  };

  const uploadLinkBanner = async (file: File, columnIndex: number, linkIndex: number) => {
    try {
      const uploaded = await cmsApi.navigationMenus.uploadMedia(file, { kind: 'banner' });
      setConfig((prev) => {
        const next = structuredClone(prev);
        const row = next.columns[columnIndex]?.links[linkIndex];
        if (!row) return prev;
        row.bannerUrl = uploaded.url;
        return next;
      });
      toast.success('Section banner uploaded');
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Upload failed');
    }
  };

  const uploadHeroBanner = async (file: File) => {
    try {
      const uploaded = await cmsApi.navigationMenus.uploadMedia(file, { kind: 'banner' });
      setConfig((prev) => ({ ...prev, heroBannerUrl: uploaded.url }));
      toast.success('Main page banner uploaded');
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Upload failed');
    }
  };

  const homeCategories = config.homeCategories ?? [];

  return (
    <div className="space-y-6">
      <AdminPanel title="Menu label">
        <input
          className={fieldClassName}
          value={config.label}
          onChange={(event) => setConfig((prev) => ({ ...prev, label: event.target.value }))}
          placeholder="Women"
        />
        <p className="mt-2 text-xs text-neutral-500">
          Shown in the storefront nav. The main shop page for this gender is{' '}
          <code className="rounded bg-black/5 px-1">/products?gender={menuKey}</code>.
        </p>

        {(menuKey === 'women' || menuKey === 'men') && (
          <div className="mt-4 space-y-3 border-t border-[var(--admin-line)] pt-4">
            <p className="text-sm font-medium text-[var(--admin-ink)]">
              {config.label || menuKey} main page banner
            </p>
            <p className="text-xs text-neutral-500">
              Hero image on the {config.label || menuKey} shop page (
              <code className="rounded bg-black/5 px-1">/products?gender={menuKey}</code>
              ). Upload a wide banner (recommended ~2400×1200).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative h-20 w-40 overflow-hidden rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]">
                {config.heroBannerUrl ? (
                  <img src={config.heroBannerUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-neutral-500">
                    No banner
                  </div>
                )}
              </div>
              <button
                type="button"
                className="admin-btn"
                onClick={() => {
                  setPendingUpload({ kind: 'heroBanner' });
                  fileInputRef.current?.click();
                }}
              >
                {config.heroBannerUrl ? 'Replace banner' : 'Upload banner'}
              </button>
              {config.heroBannerUrl ? (
                <button
                  type="button"
                  className="admin-btn text-red-600"
                  onClick={() => setConfig((prev) => ({ ...prev, heroBannerUrl: '' }))}
                >
                  Clear banner
                </button>
              ) : null}
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Link columns">
        <p className="mb-4 text-xs text-neutral-500">
          Use <strong>Bold subheading</strong> for section labels inside a column (e.g. Pants,
          Skirts, Footwear) — they appear as bold uppercase text with no link. Regular links need a
          route slug. Upload a page banner for each linked section; it appears on that category page
          after you save.
        </p>
        <div className="space-y-4">
          {config.columns.map((column, columnIndex) => (
            <div
              key={`col-${columnIndex}`}
              className="rounded-xl border border-[var(--admin-line)] p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input
                  className={fieldClassName}
                  value={column.title}
                  placeholder="Topwear"
                  onChange={(event) => {
                    const next = structuredClone(config);
                    const col = next.columns[columnIndex];
                    if (!col) return;
                    col.title = event.target.value;
                    setConfig(next);
                  }}
                />
                <button
                  type="button"
                  className="admin-btn text-red-600"
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      columns: prev.columns.filter((_, i) => i !== columnIndex),
                    }))
                  }
                >
                  Remove column
                </button>
              </div>
              <div className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <div
                    key={`link-${columnIndex}-${linkIndex}`}
                    className={cn(
                      'rounded-lg border p-3',
                      link.heading
                        ? 'border-[var(--admin-accent)]/30 bg-[var(--admin-accent)]/5'
                        : 'border-[var(--admin-line)]',
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Checkbox
                        id={`heading-${columnIndex}-${linkIndex}`}
                        checked={Boolean(link.heading)}
                        onCheckedChange={(checked) => {
                          const next = structuredClone(config);
                          const row = next.columns[columnIndex]?.links[linkIndex];
                          if (!row) return;
                          if (checked) {
                            row.heading = true;
                            row.slug = '';
                            row.bannerUrl = '';
                          } else {
                            delete row.heading;
                          }
                          setConfig(next);
                        }}
                      />
                      <label
                        htmlFor={`heading-${columnIndex}-${linkIndex}`}
                        className="cursor-pointer text-xs font-medium text-[var(--admin-ink)]"
                      >
                        Bold subheading
                        {link.heading ? (
                          <span className="ml-1.5 font-normal text-neutral-500">
                            — not clickable, no route
                          </span>
                        ) : null}
                      </label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        className={fieldClassName}
                        placeholder={link.heading ? 'Subheading label (e.g. Pants)' : 'Label'}
                        value={link.label}
                        onChange={(event) => {
                          const next = structuredClone(config);
                          const row = next.columns[columnIndex]?.links[linkIndex];
                          if (!row) return;
                          row.label = event.target.value;
                          setConfig(next);
                        }}
                      />
                      <div>
                        <input
                          className={fieldClassName}
                          placeholder="Route (e.g. all-topwear)"
                          value={link.slug}
                          disabled={Boolean(link.heading)}
                          onChange={(event) => {
                            const next = structuredClone(config);
                            const row = next.columns[columnIndex]?.links[linkIndex];
                            if (!row || row.heading) return;
                            row.slug = event.target.value;
                            setConfig(next);
                          }}
                        />
                        {!link.heading && link.slug.trim() ? (
                          <p className="mt-1 text-[10px] text-neutral-500">
                            Opens: {megaMenuHrefPreview(link.slug, menuKey)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="admin-btn text-red-600"
                        onClick={() => {
                          const next = structuredClone(config);
                          const col = next.columns[columnIndex];
                          if (!col) return;
                          col.links = col.links.filter((_, i) => i !== linkIndex);
                          setConfig(next);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    {!link.heading ? (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="relative h-14 w-28 overflow-hidden rounded-md border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]">
                          {link.bannerUrl ? (
                            <img
                              src={link.bannerUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-neutral-500">
                              No banner
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={!link.slug.trim()}
                          onClick={() => {
                            setPendingUpload({ kind: 'linkBanner', columnIndex, linkIndex });
                            fileInputRef.current?.click();
                          }}
                        >
                          {link.bannerUrl ? 'Replace banner' : 'Upload banner'}
                        </button>
                        {link.bannerUrl ? (
                          <button
                            type="button"
                            className="admin-btn text-red-600"
                            onClick={() => {
                              const next = structuredClone(config);
                              const row = next.columns[columnIndex]?.links[linkIndex];
                              if (!row) return;
                              row.bannerUrl = '';
                              setConfig(next);
                            }}
                          >
                            Clear banner
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => {
                    const next = structuredClone(config);
                    next.columns[columnIndex]?.links.push(emptyLink());
                    setConfig(next);
                  }}
                >
                  + Add link
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => {
                    const next = structuredClone(config);
                    next.columns[columnIndex]?.links.push(emptyHeading());
                    setConfig(next);
                  }}
                >
                  + Add subheading
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="admin-btn"
            onClick={() =>
              setConfig((prev) => ({ ...prev, columns: [...prev.columns, emptyColumn()] }))
            }
          >
            + Add column
          </button>
        </div>
      </AdminPanel>

      {menuKey === 'women' ? (
        <AdminPanel title="Homepage Categories tiles">
          <p className="mb-4 text-xs text-neutral-500">
            These images appear in the homepage Categories grid (New Arrival, Jeans, Oversized,
            etc.). Change each picture individually, then save.
          </p>
          <div className="space-y-3">
            {homeCategories.map((tile, index) => (
              <div
                key={`home-cat-${index}`}
                className="grid gap-3 rounded-xl border border-[var(--admin-line)] p-4 sm:grid-cols-[5rem_1fr_1fr_auto]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]">
                  {tile.imageUrl ? (
                    <img src={tile.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-neutral-500">
                      No image
                    </div>
                  )}
                </div>
                <input
                  className={fieldClassName}
                  placeholder="Label"
                  value={tile.label}
                  onChange={(event) => {
                    const next = structuredClone(config);
                    const list = next.homeCategories ?? [];
                    const row = list[index];
                    if (!row) return;
                    row.label = event.target.value;
                    next.homeCategories = list;
                    setConfig(next);
                  }}
                />
                <div>
                  <input
                    className={fieldClassName}
                    placeholder="Route (e.g. jeans-denim)"
                    value={tile.slug}
                    onChange={(event) => {
                      const next = structuredClone(config);
                      const list = next.homeCategories ?? [];
                      const row = list[index];
                      if (!row) return;
                      row.slug = event.target.value;
                      next.homeCategories = list;
                      setConfig(next);
                    }}
                  />
                  {tile.slug.trim() ? (
                    <p className="mt-1 text-[10px] text-neutral-500">
                      Opens: {megaMenuHrefPreview(tile.slug, menuKey)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-4">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => {
                      setPendingUpload({ kind: 'homeCategories', index });
                      fileInputRef.current?.click();
                    }}
                  >
                    {tile.imageUrl ? 'Replace image' : 'Upload image'}
                  </button>
                  <button
                    type="button"
                    className="admin-btn text-red-600"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        homeCategories: (prev.homeCategories ?? []).filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  homeCategories: [...(prev.homeCategories ?? []), emptyTile()],
                }))
              }
            >
              + Add category tile
            </button>
          </div>
        </AdminPanel>
      ) : null}

      {(
        [
          ['specials', 'Specials (circular tiles)'],
          ['featured', 'Shop the edit (banners)'],
        ] as const
      ).map(([kind, title]) => (
        <AdminPanel key={kind} title={title}>
          <div className="space-y-3">
            {config[kind].map((tile, index) => (
              <div
                key={`${kind}-${index}`}
                className="grid gap-3 rounded-xl border border-[var(--admin-line)] p-4 sm:grid-cols-[5rem_1fr_1fr_auto]"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]">
                  {tile.imageUrl ? (
                    <img src={tile.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-neutral-500">
                      No image
                    </div>
                  )}
                </div>
                <input
                  className={fieldClassName}
                  placeholder="Label"
                  value={tile.label}
                  onChange={(event) => {
                    const next = structuredClone(config);
                    const row = next[kind][index];
                    if (!row) return;
                    row.label = event.target.value;
                    setConfig(next);
                  }}
                />
                <div>
                  <input
                    className={fieldClassName}
                    placeholder="Route (e.g. all-topwear)"
                    value={tile.slug}
                    onChange={(event) => {
                      const next = structuredClone(config);
                      const row = next[kind][index];
                      if (!row) return;
                      row.slug = event.target.value;
                      setConfig(next);
                    }}
                  />
                  {tile.slug.trim() ? (
                    <p className="mt-1 text-[10px] text-neutral-500">
                      Opens: {megaMenuHrefPreview(tile.slug, menuKey)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 sm:col-span-4">
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => {
                      setPendingUpload({ kind, index });
                      fileInputRef.current?.click();
                    }}
                  >
                    Upload image
                  </button>
                  <button
                    type="button"
                    className="admin-btn text-red-600"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        [kind]: prev[kind].filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn"
              onClick={() =>
                setConfig((prev) => ({ ...prev, [kind]: [...prev[kind], emptyTile()] }))
              }
            >
              + Add tile
            </button>
          </div>
        </AdminPanel>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && pendingUpload) {
            if (pendingUpload.kind === 'heroBanner') {
              void uploadHeroBanner(file);
            } else if (pendingUpload.kind === 'linkBanner') {
              void uploadLinkBanner(file, pendingUpload.columnIndex, pendingUpload.linkIndex);
            } else {
              void uploadTileImage(file, pendingUpload.kind, pendingUpload.index);
            }
          }
          setPendingUpload(null);
          event.target.value = '';
        }}
      />

      <div className="flex justify-end gap-3">
        <button
          type="button"
          className="admin-btn"
          onClick={() => setConfig(structuredClone(DEFAULT_MEGA_MENUS[menuKey]))}
        >
          Reset to defaults
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save mega menu'}
        </button>
      </div>
    </div>
  );
}

export function MegaMenuPage() {
  return (
    <PageMotion>
      <AdminPageHeader
        title="Mega menu"
        description="Edit Women/Men main page banners, homepage Categories tiles, navigation columns, Specials, and Shop the edit."
      />
      <Tabs defaultValue="women" className="space-y-6">
        <TabsList>
          <TabsTrigger value="women">Women</TabsTrigger>
          <TabsTrigger value="men">Men</TabsTrigger>
        </TabsList>
        <TabsContent value="women">
          <MegaMenuEditor menuKey="women" />
        </TabsContent>
        <TabsContent value="men">
          <MegaMenuEditor menuKey="men" />
        </TabsContent>
      </Tabs>
    </PageMotion>
  );
}
