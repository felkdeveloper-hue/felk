import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageMotion } from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { useAdminPermissions } from '@/hooks/admin';
import { AppError } from '@/lib/errors';
import { isProductLive } from '@/lib/product-status';
import { cn } from '@/lib/utils';
import {
  cmsApi,
  inventoryApi,
  mediaApi,
  productsApi,
  type AdminVariant,
  type ProductSpecification,
} from '@/services/sdk/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Schema & helpers
// ─────────────────────────────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().optional(),
  status: z.string().default('draft'),
  visibility: z.string().default('public'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  materialId: z.string().optional(),
  gender: z.string().optional(),
  occasionId: z.string().optional(),
  tags: z.string().optional(),
  price: z.string().optional(),
  salePrice: z.string().optional(),
  compareAtPrice: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isClearance: z.boolean().default(false),
  returnsAvailable: z.boolean().default(true),
  warrantyAvailable: z.boolean().default(false),
  warrantyDetails: z.string().optional(),
  returnsCriteria: z.string().optional(),
  paymentOption: z.enum(['cod', 'prepaid', 'both']).default('both'),
});
type ProductFormValues = z.infer<typeof productSchema>;

function slugify(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function parseMoney(v?: string) {
  if (!v?.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function masterDataCode(name: string) {
  return slugify(name).toUpperCase().replace(/-/g, '_').slice(0, 32) || 'ITEM';
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable UI pieces
// ─────────────────────────────────────────────────────────────────────────────

const fieldCls =
  'w-full rounded-none border border-[var(--admin-line)] bg-white px-3 py-2 text-sm text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)] dark:bg-[var(--admin-panel-soft)] disabled:opacity-50';
const labelCls =
  'block text-xs font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)] mb-1';
const cardCls =
  'rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 space-y-4';
const sectionTitleCls = 'text-sm font-bold text-[var(--admin-ink)] uppercase tracking-wider mb-3';

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function SidebarCard({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel)]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--admin-ink)] hover:bg-[var(--admin-panel-soft)]"
        onClick={() => setOpen((p) => !p)}
      >
        {title}
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open ? <div className="space-y-3 px-4 pb-4 pt-0">{children}</div> : null}
    </div>
  );
}

function PlacementToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="hover:bg-[var(--admin-line)]/30 flex cursor-pointer items-center justify-between gap-2 rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2.5">
      <div>
        <p className="text-xs font-semibold text-[var(--admin-ink)]">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] text-[var(--admin-ink-muted)]">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-line)]',
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Images section (self-contained)
// ─────────────────────────────────────────────────────────────────────────────

function ProductImagesSection({
  productId,
  canUpload,
  canDelete,
}: {
  productId: string;
  canUpload: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const mediaQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
    queryFn: () => mediaApi.list(productId),
  });
  const images = (mediaQuery.data ?? []).filter((m) => !m.variantId);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
    });

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      mediaApi.upload(productId, file, { isPrimary: images.length === 0 }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Upload failed'),
  });
  const primaryMut = useMutation({
    mutationFn: (id: string) => mediaApi.setPrimary(id),
    onSuccess: () => invalidate(),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
    onSuccess: () => invalidate(),
  });
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative size-24 shrink-0 overflow-hidden rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel-soft)]"
          >
            <img
              src={img.thumbnailUrl || img.url}
              alt={img.alt || ''}
              className="size-full object-cover"
            />
            {img.isPrimary ? (
              <span className="absolute left-0 top-0 bg-[var(--admin-ink)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--admin-surface)]">
                Main
              </span>
            ) : null}
            <div className="absolute inset-0 flex items-end justify-end gap-1 bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!img.isPrimary ? (
                <button
                  type="button"
                  onClick={() => primaryMut.mutate(img.id)}
                  title="Set as main"
                  className="rounded-none bg-white/90 p-1 text-[var(--admin-ink)] hover:bg-white"
                >
                  <Star className="size-3" />
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => removeMut.mutate(img.id)}
                  className="rounded-none bg-red-600 p-1 text-white hover:bg-red-700"
                >
                  <Trash2 className="size-3" />
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {canUpload ? (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMut.isPending}
              className="flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-none border border-dashed border-[var(--admin-line)] text-[var(--admin-ink-muted)] transition hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] disabled:opacity-50"
            >
              {uploadMut.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Upload className="size-5" />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {uploadMut.isPending ? 'Uploading…' : 'Add photo'}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                files.forEach((file) => uploadMut.mutate(file));
                e.target.value = '';
              }}
            />
          </>
        ) : null}
      </div>
      {images.length > 0 ? (
        <p className="mt-2 text-[11px] text-[var(--admin-ink-muted)]">
          Hover an image to set it as the main (catalog) photo or delete it.
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants section (inline per-color card design)
// ─────────────────────────────────────────────────────────────────────────────

function VariantsSection({
  productId,
  productPrice,
  productSalePrice,
  canCreate,
  canUpdate,
  canDelete,
}: {
  productId: string;
  productPrice: number;
  productSalePrice?: number | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const queryClient = useQueryClient();
  const variantsQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.detail(productId), 'variants'],
    queryFn: () => productsApi.listVariants(productId),
  });
  const stockQuery = useQuery({
    queryKey: QUERY_KEYS.inventory.items({ productId, limit: 200 }),
    queryFn: () => inventoryApi.listItems({ productId, limit: 200 }),
  });
  const mediaQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
    queryFn: () => mediaApi.list(productId),
  });
  const sizesQuery = useQuery({
    queryKey: ['cms', 'sizes', 'variant-form'],
    queryFn: () => cmsApi.sizes.list({ limit: 100, status: 'active' }),
  });
  const colorsQuery = useQuery({
    queryKey: ['cms', 'colors', 'variant-form'],
    queryFn: () => cmsApi.colors.list({ limit: 100, status: 'active' }),
  });

  const variants = variantsQuery.data ?? [];
  const stockRows = stockQuery.data?.data ?? [];
  const media = mediaQuery.data ?? [];
  const sizes = sizesQuery.data?.data ?? [];
  const colors = colorsQuery.data?.data ?? [];

  const [addingColor, setAddingColor] = useState(false);
  const [newColorId, setNewColorId] = useState('');
  const [newSizeIds, setNewSizeIds] = useState<string[]>([]);
  const [newStockMap, setNewStockMap] = useState<Record<string, string>>({});
  const [newPrice, setNewPrice] = useState(String(productPrice || ''));
  const [newSalePrice, setNewSalePrice] = useState(
    productSalePrice ? String(productSalePrice) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockRows) {
      if (!row.variantId) continue;
      map.set(row.variantId, (map.get(row.variantId) ?? 0) + row.quantityOnHand);
    }
    return map;
  }, [stockRows]);

  const variantMediaMap = useMemo(() => {
    const map = new Map<string, typeof media>();
    for (const item of media) {
      if (!item.variantId) continue;
      map.set(item.variantId, [...(map.get(item.variantId) ?? []), item]);
    }
    return map;
  }, [media]);

  // Group variants by colorId
  const colorGroups = useMemo(() => {
    const groups = new Map<string, AdminVariant[]>();
    for (const v of variants) {
      const key = v.colorId ?? '__no_color__';
      groups.set(key, [...(groups.get(key) ?? []), v]);
    }
    return groups;
  }, [variants]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'variants'],
      }),
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.inventory.items({ productId, limit: 200 }),
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const sizeOptions = newSizeIds.length ? newSizeIds : [''];
      const basePrice = Number(newPrice) || 0;
      const baseSale = newSalePrice === '' ? null : Number(newSalePrice);
      const existingKeys = new Set(variants.map((v) => `${v.colorId ?? ''}:${v.sizeId ?? ''}`));
      let created = 0;
      for (const sizeId of sizeOptions) {
        const key = `${newColorId}:${sizeId}`;
        if (existingKeys.has(key)) continue;
        const colorName = colors.find((c) => c.id === newColorId)?.name;
        const sizeName = sizes.find((s) => s.id === sizeId)?.name;
        const autoTitle = [colorName, sizeName].filter(Boolean).join(' / ') || undefined;
        const variant = await productsApi.createVariant(productId, {
          title: autoTitle,
          colorId: newColorId || null,
          sizeId: sizeId || null,
          price: basePrice,
          salePrice: baseSale,
          currency: 'LKR',
        });
        // Set stock for this variant
        const stock = Number(newStockMap[sizeId] ?? 0);
        if (stock > 0) {
          await inventoryApi.setStock({ variantId: variant.id, quantity: stock });
        }
        created++;
      }
      if (!created) throw new AppError('These variants already exist.');
      return created;
    },
    onSuccess: async (count) => {
      toast.success(`${count} variant${count !== 1 ? 's' : ''} added`);
      setAddingColor(false);
      setNewColorId('');
      setNewSizeIds([]);
      setNewStockMap({});
      setError(null);
      await invalidate();
    },
    onError: (err) => setError(err instanceof AppError ? err.message : 'Unable to add variants.'),
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      productsApi.updateVariant(id, { title: title.trim() || undefined }),
    onSuccess: async () => {
      setEditingVariantId(null);
      await invalidate();
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (variantId: string) => productsApi.updateVariant(variantId, { isDefault: true }),
    onSuccess: async () => {
      toast.success('Default variant updated');
      await invalidate();
    },
  });

  const setStockMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      inventoryApi.setStock({ variantId, quantity }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.inventory.items({ productId, limit: 200 }),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.removeVariant(id),
    onSuccess: async () => {
      toast.success('Variant removed');
      await invalidate();
    },
  });

  const uploadVariantImageMutation = useMutation({
    mutationFn: ({ variantId, file }: { variantId: string; file: File }) =>
      mediaApi.upload(productId, file, { variantId }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Upload failed'),
  });

  const toggleSize = (id: string) =>
    setNewSizeIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const usedColorIds = new Set([...colorGroups.keys()].filter((k) => k !== '__no_color__'));
  const availableColors = colors.filter((c) => !usedColorIds.has(c.id));

  if (variantsQuery.isLoading) {
    return (
      <div className="py-6 text-center text-sm text-[var(--admin-ink-muted)]">
        Loading variants…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing variant groups */}
      {[...colorGroups.entries()].map(([colorKey, colorVariants]) => {
        const colorLabel =
          colorKey === '__no_color__'
            ? 'No color'
            : (colors.find((c) => c.id === colorKey)?.name ?? colorKey);
        const firstVariant = colorVariants[0] as AdminVariant | undefined;
        const variantImages = variantMediaMap.get(firstVariant?.id ?? '') ?? [];
        const isDefault = colorVariants.some((v) => v.isDefault);

        return (
          <div
            key={colorKey}
            className={cn(
              'overflow-hidden rounded-none border bg-[var(--admin-panel)]',
              isDefault ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-line)]',
            )}
          >
            {/* Color header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                {isDefault ? (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <Star className="size-2.5" /> Default
                  </span>
                ) : null}
                <span className="text-sm font-bold text-[var(--admin-ink)]">{colorLabel}</span>
                <span className="text-xs text-[var(--admin-ink-muted)]">
                  {colorVariants.length} size{colorVariants.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isDefault && canUpdate && firstVariant ? (
                  <button
                    type="button"
                    onClick={() => setDefaultMutation.mutate(firstVariant!.id)}
                    className="text-xs text-[var(--admin-ink-muted)] underline hover:text-[var(--admin-ink)]"
                  >
                    Set as default listing
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex gap-4 p-4">
              {/* Variant photo */}
              <div className="w-20 shrink-0 space-y-1.5">
                {variantImages.length && variantImages[0] ? (
                  <img
                    src={variantImages[0].url}
                    alt=""
                    className="aspect-[3/4] w-20 rounded-none object-cover ring-1 ring-[var(--admin-line)]"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-20 items-center justify-center rounded-none bg-[var(--admin-panel-soft)] ring-1 ring-[var(--admin-line)]">
                    <ImageIcon className="size-6 text-[var(--admin-ink-muted)]" />
                  </div>
                )}
                {canCreate && firstVariant ? (
                  <label className="flex cursor-pointer items-center justify-center gap-1 rounded-none border border-dashed border-[var(--admin-line)] py-1 text-[10px] text-[var(--admin-ink-muted)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)]">
                    <Upload className="size-3" />
                    Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && firstVariant)
                          uploadVariantImageMutation.mutate({ variantId: firstVariant.id, file });
                      }}
                    />
                  </label>
                ) : null}
              </div>

              {/* Sizes + stock table */}
              <div className="min-w-0 flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-line)]">
                      <th className="pb-2 text-left font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                        Size
                      </th>
                      <th className="pb-2 text-left font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                        Name / Label
                      </th>
                      <th className="pb-2 text-center font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                        Stock
                      </th>
                      <th className="pb-2 text-right font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                        Price
                      </th>
                      {canDelete ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {colorVariants.map((variant) => {
                      const sizeName = variant.sizeId
                        ? (sizes.find((s) => s.id === variant.sizeId)?.name ?? variant.sizeId)
                        : '—';
                      const stock = stockByVariant.get(variant.id) ?? 0;
                      const isEditing = editingVariantId === variant.id;

                      return (
                        <tr
                          key={variant.id}
                          className="border-[var(--admin-line)]/50 border-b last:border-0"
                        >
                          <td className="py-2 pr-3 font-medium text-[var(--admin-ink)]">
                            {sizeName}
                          </td>
                          <td className="py-2 pr-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full rounded-none border border-[var(--admin-accent)] bg-white px-2 py-1 text-xs outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      updateTitleMutation.mutate({
                                        id: variant.id,
                                        title: editTitle,
                                      });
                                    if (e.key === 'Escape') setEditingVariantId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="rounded-none bg-[var(--admin-accent)] px-2 py-1 text-[10px] font-bold text-white"
                                  onClick={() =>
                                    updateTitleMutation.mutate({ id: variant.id, title: editTitle })
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="rounded-none px-1 py-1 text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
                                  onClick={() => setEditingVariantId(null)}
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="truncate text-left text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)] hover:underline"
                                onClick={() => {
                                  setEditingVariantId(variant.id);
                                  setEditTitle(variant.title ?? '');
                                }}
                                disabled={!canUpdate}
                              >
                                {variant.title || (
                                  <span className="italic opacity-50">click to add label</span>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-center">
                            <input
                              type="number"
                              min={0}
                              defaultValue={stock}
                              disabled={!canUpdate}
                              className="w-16 rounded-none border border-[var(--admin-line)] bg-white px-2 py-1 text-center text-xs outline-none focus:border-[var(--admin-accent)] disabled:opacity-50"
                              onBlur={(e) => {
                                const qty = Number(e.target.value);
                                if (qty !== stock)
                                  setStockMutation.mutate({ variantId: variant.id, quantity: qty });
                              }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right font-medium text-[var(--admin-ink)]">
                            LKR {(variant.salePrice ?? variant.price).toLocaleString()}
                          </td>
                          {canDelete ? (
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('Remove this variant?'))
                                    deleteMutation.mutate(variant.id);
                                }}
                                className="rounded-none p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add color form */}
      {addingColor ? (
        <div className="border-[var(--admin-accent)]/50 space-y-4 rounded-none border bg-[var(--admin-panel)] p-4">
          <p className="text-sm font-bold text-[var(--admin-ink)]">Add new color variant</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Color">
              <select
                value={newColorId}
                onChange={(e) => setNewColorId(e.target.value)}
                className={fieldCls}
              >
                <option value="">— Select color —</option>
                {availableColors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Price (LKR)">
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className={fieldCls}
                  min={0}
                />
              </Field>
              <Field label="Sale Price">
                <input
                  type="number"
                  value={newSalePrice}
                  onChange={(e) => setNewSalePrice(e.target.value)}
                  className={fieldCls}
                  min={0}
                  placeholder="optional"
                />
              </Field>
            </div>
          </div>

          <div>
            <p className={labelCls}>Sizes & Stock — select which sizes are available</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {sizes.map((size) => {
                const selected = newSizeIds.includes(size.id);
                return (
                  <div key={size.id} className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleSize(size.id)}
                      className={cn(
                        'rounded-none border px-3 py-1.5 text-xs font-semibold transition-colors',
                        selected
                          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white'
                          : 'hover:border-[var(--admin-accent)]/50 border-[var(--admin-line)] text-[var(--admin-ink)]',
                      )}
                    >
                      {size.name}
                    </button>
                    {selected ? (
                      <input
                        type="number"
                        min={0}
                        placeholder="qty"
                        value={newStockMap[size.id] ?? ''}
                        onChange={(e) =>
                          setNewStockMap((m) => ({ ...m, [size.id]: e.target.value }))
                        }
                        className="w-14 rounded-none border border-[var(--admin-line)] bg-white px-1.5 py-1 text-center text-xs outline-none focus:border-[var(--admin-accent)]"
                      />
                    ) : null}
                  </div>
                );
              })}
              {!sizes.length ? (
                <p className="text-xs text-[var(--admin-ink-muted)]">
                  No sizes configured yet — add them under Filters.
                </p>
              ) : null}
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--admin-ink-muted)]">
              Leave all sizes unselected to add a single "one-size" variant.
            </p>
          </div>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-none bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add variant
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingColor(false);
                setError(null);
              }}
              className="inline-flex h-9 items-center rounded-none px-4 text-sm text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!addingColor && canCreate ? (
        <button
          type="button"
          onClick={() => setAddingColor(true)}
          className="inline-flex h-9 items-center gap-2 rounded-none border border-dashed border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink-muted)] transition hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)]"
        >
          <Plus className="size-4" /> Add color variant
        </button>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main product form
// ─────────────────────────────────────────────────────────────────────────────

const SPEC_PRESETS = [
  'Fit',
  'Neckline',
  'Pattern',
  'Sleeve length',
  'Length',
  'Rise',
  'Closure',
  'Fabric care',
  'Country of origin',
] as const;

export function ProductFormPage({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { products: productPerms, inventory } = useAdminPermissions();
  const isEdit = Boolean(productId);
  const [specRows, setSpecRows] = useState<ProductSpecification[]>([
    { name: 'Fit', value: '' },
    { name: 'Fabric care', value: '' },
  ]);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Fetch CMS data
  const categoriesQuery = useQuery({
    queryKey: ['cms', 'categories', 'product-form'],
    queryFn: () => cmsApi.categories.list({ limit: 100, status: 'active' }),
  });
  const brandsQuery = useQuery({
    queryKey: ['cms', 'brands', 'product-form'],
    queryFn: () => cmsApi.brands.list({ limit: 100, status: 'active' }),
  });
  const occasionsQuery = useQuery({
    queryKey: ['cms', 'occasions', 'product-form'],
    queryFn: () => cmsApi.occasions.list({ limit: 100, status: 'active' }),
  });
  const materialsQuery = useQuery({
    queryKey: ['cms', 'materials', 'product-form'],
    queryFn: () => cmsApi.materials.list({ limit: 100, status: 'active' }),
  });

  // Fetch product (edit mode)
  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.products.detail(productId ?? ''),
    queryFn: () => productsApi.getById(productId!),
    enabled: isEdit,
  });
  const product = detailQuery.data;
  const isPublished = isEdit ? isProductLive(product?.status) : false;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      status: 'draft',
      visibility: 'public',
      shortDescription: '',
      description: '',
      categoryId: '',
      brandId: '',
      materialId: '',
      gender: '',
      occasionId: '',
      tags: '',
      price: '',
      salePrice: '',
      compareAtPrice: '',
      isFeatured: false,
      isTrending: false,
      isNewArrival: false,
      isBestSeller: false,
      isClearance: false,
      returnsAvailable: true,
      warrantyAvailable: false,
      warrantyDetails: '',
      returnsCriteria: '7-day easy returns & instant refunds on eligible items.',
      paymentOption: 'both',
    },
  });

  const w = watch();

  const setFlag = (field: keyof ProductFormValues, value: boolean) =>
    setValue(field as 'isFeatured', value as any, { shouldDirty: true });

  // Populate form on edit
  useEffect(() => {
    if (!product) return;
    reset({
      name: product.name,
      slug: product.slug,
      status: product.status,
      visibility: product.visibility ?? 'public',
      shortDescription: product.shortDescription ?? '',
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      brandId: product.brandId ?? '',
      materialId: product.materialId ?? '',
      gender: product.gender ?? '',
      occasionId: product.occasionIds?.[0] ?? '',
      tags: product.tags?.join(', ') ?? '',
      price: product.price ? String(product.price) : '',
      salePrice: product.salePrice ? String(product.salePrice) : '',
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      isFeatured: product.isFeatured ?? false,
      isTrending: product.isTrending ?? false,
      isNewArrival: product.isNewArrival ?? false,
      isBestSeller: product.isBestSeller ?? false,
      isClearance: product.isClearance ?? false,
      returnsAvailable: product.returnsAvailable ?? true,
      warrantyAvailable: product.warrantyAvailable ?? false,
      warrantyDetails: product.warrantyDetails ?? '',
      returnsCriteria:
        product.returnsCriteria ?? '7-day easy returns & instant refunds on eligible items.',
      paymentOption: product.paymentOption ?? 'both',
    });
    if (product.specifications?.length) setSpecRows(product.specifications);
    setSeoTitle(product.seoTitle ?? '');
    setSeoDescription(product.seoDescription ?? '');
  }, [product, reset]);

  // Auto-slug from name
  const nameVal = watch('name');
  useEffect(() => {
    if (!isEdit) setValue('slug', slugify(nameVal ?? ''));
  }, [nameVal, isEdit, setValue]);

  const buildPayload = (data: ProductFormValues) => ({
    name: data.name,
    slug: data.slug?.trim() || slugify(data.name),
    status: data.status,
    visibility: data.visibility,
    shortDescription: data.shortDescription?.trim() || undefined,
    description: data.description?.trim() || undefined,
    categoryId: data.categoryId || undefined,
    brandId: data.brandId || undefined,
    materialId: data.materialId || undefined,
    gender: data.gender || undefined,
    occasionIds: data.occasionId ? [data.occasionId] : [],
    tags: data.tags?.trim()
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    price: parseMoney(data.price) ?? 0,
    salePrice: parseMoney(data.salePrice) ?? null,
    compareAtPrice: parseMoney(data.compareAtPrice) ?? null,
    currency: 'LKR',
    isFeatured: data.isFeatured,
    isTrending: data.isTrending,
    isNewArrival: data.isNewArrival,
    isBestSeller: data.isBestSeller,
    isClearance: data.isClearance,
    returnsAvailable: data.returnsAvailable,
    returnsCriteria: data.returnsCriteria?.trim() || null,
    warrantyAvailable: data.warrantyAvailable,
    warrantyDetails: data.warrantyDetails?.trim() || null,
    paymentOption: data.paymentOption,
    specifications: specRows.filter((r) => r.name?.trim() && r.value?.trim()),
    seo: { title: seoTitle.trim() || undefined, description: seoDescription.trim() || undefined },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductFormValues) => productsApi.create(buildPayload(data)),
    onSuccess: async (created) => {
      toast.success('Product created — now add images and variants');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate({ to: ADMIN_ROUTES.productDetail.replace('$productId', created.id) });
    },
    onError: (err) =>
      toast.error(err instanceof AppError ? err.message : 'Unable to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProductFormValues) => productsApi.update(productId!, buildPayload(data)),
    onSuccess: async () => {
      toast.success('Product saved');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId!) }),
      ]);
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to save product'),
  });

  const publishMutation = useMutation({
    mutationFn: () => productsApi.publish(productId!),
    onSuccess: async () => {
      toast.success('Product published');
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId!) });
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to publish'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.remove(productId!),
    onSuccess: async () => {
      toast.success('Product deleted');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate({ to: ADMIN_ROUTES.products });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    if (isEdit) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && detailQuery.isLoading) {
    return (
      <PageMotion>
        <div className="flex items-center justify-center py-24 text-[var(--admin-ink-muted)]">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </PageMotion>
    );
  }

  const categories = categoriesQuery.data?.data ?? [];
  const brands = brandsQuery.data?.data ?? [];
  const occasions = occasionsQuery.data?.data ?? [];
  const materials = materialsQuery.data?.data ?? [];

  // Category tree — grouped by top-level section
  const womenCats = categories.filter((c) => {
    const gender = c['gender'] as string | undefined;
    const parentSlug = c['parentSlug'] as string | undefined;
    const parentId = c['parentId'] as string | undefined;
    return (
      gender === 'women' ||
      parentSlug === 'women' ||
      parentSlug?.includes('women') ||
      (parentId && !c['parentSlug'])
    );
  });
  const accessoriesCats = categories.filter((c) => {
    const parentSlug = c['parentSlug'] as string | undefined;
    return parentSlug === 'accessories' || parentSlug?.includes('accessor');
  });
  const parentCats = categories.filter((c) => {
    const parentId = c['parentId'] as string | undefined;
    const slug = c.slug ?? '';
    return !parentId && !['men', 'women', 'accessories'].includes(slug);
  });

  return (
    <PageMotion>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Page header ── */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-[var(--admin-ink-muted)]">
              <Link to={ADMIN_ROUTES.products} className="hover:underline">
                Products
              </Link>
              <span>/</span>
              <span className="text-[var(--admin-ink)]">
                {isEdit ? (product?.name ?? 'Edit') : 'New product'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--admin-ink)]">
              {isEdit ? 'Edit product' : 'Add product'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && !isPublished && productPerms.publish ? (
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-none bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {publishMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Publish
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-9 items-center gap-1.5 rounded-none bg-[var(--admin-ink)] px-5 text-sm font-semibold text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {isEdit ? 'Save changes' : 'Create product'}
            </button>
            <Link
              to={ADMIN_ROUTES.products}
              className="inline-flex h-9 items-center rounded-none px-4 text-sm text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── LEFT: main content ── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic info */}
            <div className={cardCls}>
              <p className={sectionTitleCls}>Product info</p>
              <Field label="Product name *" error={errors.name?.message}>
                <input
                  {...register('name')}
                  className={fieldCls}
                  placeholder="e.g. Women's Silk Wrap Midi Dress"
                />
              </Field>
              <Field label="Short description">
                <textarea
                  {...register('shortDescription')}
                  rows={2}
                  className={fieldCls}
                  placeholder="One-liner shown on product cards"
                />
              </Field>
              <Field label="Full description">
                <textarea
                  {...register('description')}
                  rows={5}
                  className={fieldCls}
                  placeholder="Full product description shown on the product page"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="URL slug (auto-generated)">
                  <input {...register('slug')} className={fieldCls} placeholder="auto-generated" />
                </Field>
                <Field label="SKU">
                  <input
                    disabled
                    placeholder="Auto-assigned on save"
                    className={cn(fieldCls, 'opacity-40')}
                  />
                </Field>
              </div>
            </div>

            {/* Images — only in edit mode */}
            {isEdit && productId ? (
              <div className={cardCls}>
                <p className={sectionTitleCls}>Photos</p>
                <p className="-mt-2 mb-3 text-xs text-[var(--admin-ink-muted)]">
                  First image is the main photo shown in the catalog. Click any image to set it as
                  primary.
                </p>
                <ProductImagesSection
                  productId={productId}
                  canUpload={productPerms.create || productPerms.update}
                  canDelete={productPerms.delete}
                />
              </div>
            ) : null}

            {/* Variants — only in edit mode */}
            {isEdit && productId ? (
              <div className={cardCls}>
                <div className="-mt-1 mb-1 flex items-center justify-between">
                  <p className={sectionTitleCls}>Color &amp; size variants</p>
                  <span className="text-xs text-[var(--admin-ink-muted)]">
                    Each color can have multiple sizes with individual stock counts
                  </span>
                </div>
                <p className="mb-4 text-xs text-[var(--admin-ink-muted)]">
                  The <strong>Default listing</strong> color is what appears first in the storefront
                  catalog.
                </p>
                <VariantsSection
                  productId={productId}
                  productPrice={parseMoney(w.price) ?? 0}
                  productSalePrice={parseMoney(w.salePrice) ?? null}
                  canCreate={productPerms.create || productPerms.update}
                  canUpdate={productPerms.update}
                  canDelete={productPerms.delete}
                />
              </div>
            ) : !isEdit ? (
              <div className="rounded-none border border-dashed border-[var(--admin-line)] bg-[var(--admin-panel-soft)] p-6 text-center">
                <ImageIcon className="mx-auto mb-2 size-7 text-[var(--admin-ink-muted)]" />
                <p className="text-sm font-semibold text-[var(--admin-ink)]">
                  Photos &amp; variants after saving
                </p>
                <p className="mt-1 text-xs text-[var(--admin-ink-muted)]">
                  Create the product first, then add images, colors, and sizes.
                </p>
              </div>
            ) : null}

            {/* Specifications (collapsible) */}
            <div className="overflow-hidden rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel)]">
              <button
                type="button"
                onClick={() => setShowSpecs((p) => !p)}
                className="flex w-full items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-wider text-[var(--admin-ink)] hover:bg-[var(--admin-panel-soft)]"
              >
                <span>Product specifications (optional)</span>
                {showSpecs ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>
              {showSpecs ? (
                <div className="space-y-2 px-5 pb-5">
                  <p className="mb-3 text-xs text-[var(--admin-ink-muted)]">
                    Displayed as a detail table on the product page (Fit, Fabric, etc.)
                  </p>
                  {specRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.name}
                        onChange={(e) =>
                          setSpecRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                          )
                        }
                        className={cn(fieldCls, 'w-44 shrink-0')}
                      >
                        <option value={row.name}>{row.name || '— Select —'}</option>
                        {SPEC_PRESETS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        value={row.value}
                        onChange={(e) =>
                          setSpecRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)),
                          )
                        }
                        className={cn(fieldCls, 'flex-1')}
                        placeholder="e.g. Slim Fit, 100% Cotton…"
                      />
                      <button
                        type="button"
                        onClick={() => setSpecRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="shrink-0 rounded-none p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSpecRows((prev) => [...prev, { name: '', value: '' }])}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)] hover:underline"
                  >
                    <Plus className="size-3.5" /> Add row
                  </button>
                </div>
              ) : null}
            </div>

            {/* SEO (collapsible) */}
            <div className="overflow-hidden rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel)]">
              <button
                type="button"
                onClick={() => setShowSeo((p) => !p)}
                className="flex w-full items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-wider text-[var(--admin-ink)] hover:bg-[var(--admin-panel-soft)]"
              >
                <span>SEO settings (optional)</span>
                {showSeo ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>
              {showSeo ? (
                <div className="space-y-3 px-5 pb-5">
                  <Field label="SEO title">
                    <input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      className={fieldCls}
                      placeholder={w.name || 'Auto from product name'}
                    />
                  </Field>
                  <Field label="SEO description">
                    <textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      rows={3}
                      className={fieldCls}
                      placeholder="Short description for search engines"
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── RIGHT sidebar ── */}
          <div className="space-y-4">
            {/* Status */}
            <SidebarCard title="Status & Visibility">
              <Field label="Status">
                <select {...register('status')} className={fieldCls}>
                  <option value="draft">Draft — not visible to customers</option>
                  <option value="active">Active — live in store</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <Field label="Visibility">
                <select {...register('visibility')} className={fieldCls}>
                  <option value="public">Public (everyone)</option>
                  <option value="hidden">Hidden (direct link only)</option>
                </select>
              </Field>
              {isEdit && !isPublished && productPerms.publish ? (
                <button
                  type="button"
                  onClick={() => publishMutation.mutate()}
                  disabled={publishMutation.isPending}
                  className="mt-1 w-full rounded-none bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {publishMutation.isPending ? 'Publishing…' : '🚀 Publish to storefront'}
                </button>
              ) : null}
              {isEdit && isPublished ? (
                <p className="rounded-none bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  ✓ Live on storefront
                </p>
              ) : null}
            </SidebarCard>

            {/* Pricing */}
            <SidebarCard title="Pricing (LKR)">
              <Field label="Selling price *">
                <div className="flex items-center gap-1.5">
                  <span className="w-8 shrink-0 text-xs text-[var(--admin-ink-muted)]">LKR</span>
                  <input
                    type="number"
                    {...register('price')}
                    className={fieldCls}
                    min={0}
                    placeholder="0.00"
                  />
                </div>
              </Field>
              <Field label="Sale / discounted price">
                <div className="flex items-center gap-1.5">
                  <span className="w-8 shrink-0 text-xs text-[var(--admin-ink-muted)]">LKR</span>
                  <input
                    type="number"
                    {...register('salePrice')}
                    className={fieldCls}
                    min={0}
                    placeholder="optional"
                  />
                </div>
              </Field>
              <Field label="Compare-at (original)">
                <div className="flex items-center gap-1.5">
                  <span className="w-8 shrink-0 text-xs text-[var(--admin-ink-muted)]">LKR</span>
                  <input
                    type="number"
                    {...register('compareAtPrice')}
                    className={fieldCls}
                    min={0}
                    placeholder="optional"
                  />
                </div>
              </Field>
              {w.price && w.salePrice && Number(w.salePrice) < Number(w.price) ? (
                <p className="rounded-none bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  {Math.round(((Number(w.price) - Number(w.salePrice)) / Number(w.price)) * 100)}%
                  off — will show SAVE badge
                </p>
              ) : null}
            </SidebarCard>

            {/* Category & Placement */}
            <SidebarCard title="Category & Where it appears">
              <Field label="Category">
                <select {...register('categoryId')} className={fieldCls}>
                  <option value="">— No category —</option>
                  {womenCats.length ? (
                    <optgroup label="Women">
                      {womenCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {accessoriesCats.length ? (
                    <optgroup label="Accessories">
                      {accessoriesCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {parentCats.length ? (
                    <optgroup label="Other">
                      {parentCats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {!womenCats.length && !accessoriesCats.length && !parentCats.length
                    ? categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : null}
                </select>
              </Field>
              <Field label="Gender">
                <select {...register('gender')} className={fieldCls}>
                  <option value="">— Not specified —</option>
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </Field>
              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-ink-muted)]">
                Homepage sections
              </p>
              <PlacementToggle
                label="Best Sellers"
                description="Shows in the Best Sellers row on the home page"
                checked={w.isBestSeller ?? false}
                onChange={(v) => setFlag('isBestSeller', v)}
              />
              <PlacementToggle
                label="New Arrivals"
                description="Shows in the New Arrivals row"
                checked={w.isNewArrival ?? false}
                onChange={(v) => setFlag('isNewArrival', v)}
              />
              <PlacementToggle
                label="Trending Now"
                description="Shown in the Trending section"
                checked={w.isTrending ?? false}
                onChange={(v) => setFlag('isTrending', v)}
              />
              <PlacementToggle
                label="Featured / Editor's Pick"
                checked={w.isFeatured ?? false}
                onChange={(v) => setFlag('isFeatured', v)}
              />
              <PlacementToggle
                label="On Sale / Clearance"
                description="Adds SALE badge and appears in sale filters"
                checked={w.isClearance ?? false}
                onChange={(v) => setFlag('isClearance', v)}
              />
            </SidebarCard>

            {/* Product details */}
            <SidebarCard title="Product details" defaultOpen={false}>
              <Field label="Brand">
                <select {...register('brandId')} className={fieldCls}>
                  <option value="">— No brand —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fabric / Material">
                <select {...register('materialId')} className={fieldCls}>
                  <option value="">— Not specified —</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Occasion">
                <select {...register('occasionId')} className={fieldCls}>
                  <option value="">— Not specified —</option>
                  {occasions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags (comma-separated)">
                <input
                  {...register('tags')}
                  className={fieldCls}
                  placeholder="e.g. party wear, corset, summer"
                />
              </Field>
            </SidebarCard>

            {/* Returns & Payment */}
            <SidebarCard title="Returns & payment" defaultOpen={false}>
              <PlacementToggle
                label="Returns available"
                checked={w.returnsAvailable ?? true}
                onChange={(v) => setValue('returnsAvailable', v, { shouldDirty: true })}
              />
              {w.returnsAvailable ? (
                <Field label="Returns policy text">
                  <input {...register('returnsCriteria')} className={fieldCls} />
                </Field>
              ) : null}
              <PlacementToggle
                label="Warranty included"
                checked={w.warrantyAvailable ?? false}
                onChange={(v) => setValue('warrantyAvailable', v, { shouldDirty: true })}
              />
              {w.warrantyAvailable ? (
                <Field label="Warranty details">
                  <input
                    {...register('warrantyDetails')}
                    className={fieldCls}
                    placeholder="e.g. 6-month manufacturer warranty"
                  />
                </Field>
              ) : null}
              <Field label="Payment method">
                <select {...register('paymentOption')} className={fieldCls}>
                  <option value="both">COD + Online</option>
                  <option value="prepaid">Online only</option>
                  <option value="cod">Cash on delivery only</option>
                </select>
              </Field>
            </SidebarCard>

            {/* Danger zone */}
            {isEdit && productPerms.delete ? (
              <div className="rounded-none border border-red-200 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/10">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400">
                  Danger zone
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this product? This cannot be undone.'))
                      deleteMutation.mutate();
                  }}
                  className="w-full rounded-none border border-red-300 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Delete product
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </PageMotion>
  );
}
