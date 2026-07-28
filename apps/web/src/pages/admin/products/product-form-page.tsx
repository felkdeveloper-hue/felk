import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
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
import { PageMotion, CategoryTreePicker, type CategoryPickerNode } from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { findOfficialBrandId, OFFICIAL_BRAND_NAME } from '@/constants/store-brand';
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
  type InventoryItemRow,
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
  brandId: z.string().optional(),
  materialId: z.string().optional(),
  gender: z.string().optional(),
  tags: z.string().optional(),
  price: z.string().optional(),
  salePrice: z.string().optional(),
  compareAtPrice: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isMoreToLove: z.boolean().default(false),
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
// Per-color variant card (gallery + sizes table)
// ─────────────────────────────────────────────────────────────────────────────

function ColorVariantCard({
  colorKey,
  colorLabel,
  colorVariants,
  colorImages,
  firstVariant,
  isDefault,
  isOwnListing,
  sizes,
  colors,
  stockByVariant,
  stockReady,
  canCreate,
  canUpdate,
  canDelete,
  editingVariantId,
  editTitle,
  setEditingVariantId,
  setEditTitle,
  onSetDefault,
  onToggleOwnListing,
  onUpload,
  onRemoveImage,
  onUpdateTitle,
  onSetStock,
  onUpdatePrice,
  onUpdateSize,
  onChangeColor,
  onAddSizes,
  onDelete,
}: {
  colorKey: string;
  colorLabel: string;
  colorVariants: AdminVariant[];
  colorImages: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
  firstVariant?: AdminVariant;
  isDefault: boolean;
  isOwnListing: boolean;
  sizes: Array<{ id: string; name: string }>;
  colors: Array<{ id: string; name: string }>;
  stockByVariant: Map<string, number>;
  stockReady: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  editingVariantId: string | null;
  editTitle: string;
  setEditingVariantId: (id: string | null) => void;
  setEditTitle: (v: string) => void;
  onSetDefault: (id: string) => void;
  onToggleOwnListing: (id: string, next: boolean) => void;
  onUpload: (variantId: string, file: File) => void;
  onRemoveImage: (mediaId: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onSetStock: (variantId: string, quantity: number) => void;
  onUpdatePrice: (id: string, price: number, salePrice: number | null) => void;
  onUpdateSize: (id: string, sizeId: string | null) => void;
  onChangeColor: (colorId: string) => void;
  onAddSizes: (sizeIds: string[], stockMap: Record<string, string>) => void;
  onDelete: (id: string) => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [addingSizes, setAddingSizes] = useState(false);
  const [extraSizeIds, setExtraSizeIds] = useState<string[]>([]);
  const [extraStockMap, setExtraStockMap] = useState<Record<string, string>>({});
  const currentImg = colorImages[imgIdx] ?? colorImages[0];
  const hasMultiple = colorImages.length > 1;

  const usedSizeIds = new Set(colorVariants.map((v) => v.sizeId).filter(Boolean) as string[]);
  const availableSizes = sizes.filter((s) => !usedSizeIds.has(s.id));

  useEffect(() => {
    if (imgIdx >= colorImages.length) setImgIdx(Math.max(0, colorImages.length - 1));
  }, [colorImages.length, imgIdx]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-none border bg-[var(--admin-panel)]',
        isDefault ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-line)]',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {isDefault ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <Star className="size-2.5" /> Default
            </span>
          ) : null}
          {isOwnListing ? (
            <span className="flex items-center gap-1 rounded-none border border-sky-500 bg-sky-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              <ExternalLink className="size-3" /> Own Listing Active
            </span>
          ) : null}
          {canUpdate ? (
            <select
              value={colorKey === '__no_color__' ? '' : colorKey}
              onChange={(e) => {
                const next = e.target.value;
                if (!next || next === colorKey) return;
                onChangeColor(next);
              }}
              className="rounded-none border border-[var(--admin-line)] bg-white px-2 py-1 text-sm font-bold text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]"
              title="Change color for all sizes in this group"
            >
              {colorKey === '__no_color__' ? <option value="">No color</option> : null}
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold text-[var(--admin-ink)]">{colorLabel}</span>
          )}
          <span className="text-xs text-[var(--admin-ink-muted)]">
            {colorVariants.length} size{colorVariants.length !== 1 ? 's' : ''}
            {colorImages.length > 0
              ? ` · ${colorImages.length} photo${colorImages.length !== 1 ? 's' : ''}`
              : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && canUpdate && firstVariant ? (
            <button
              type="button"
              onClick={() => onSetDefault(firstVariant.id)}
              className="text-xs text-[var(--admin-ink-muted)] underline hover:text-[var(--admin-ink)]"
            >
              Set as default listing
            </button>
          ) : null}
          {canUpdate && firstVariant ? (
            <button
              type="button"
              onClick={() => onToggleOwnListing(firstVariant.id, !isOwnListing)}
              className={cn(
                'flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-[10px] font-semibold transition',
                isOwnListing
                  ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
                  : 'border-[var(--admin-line)] text-[var(--admin-ink-muted)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)]',
              )}
              title="Show this color as its own product card on the storefront"
            >
              <ExternalLink className="size-3" />
              {isOwnListing ? '✓ Own listing ON' : 'Show as own listing'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-4 p-4">
        {/* Image gallery with arrows */}
        <div className="w-24 shrink-0 space-y-1.5">
          <div className="relative">
            {currentImg ? (
              <img
                src={currentImg.thumbnailUrl || currentImg.url}
                alt=""
                className="aspect-[3/4] w-24 rounded-none object-cover ring-1 ring-[var(--admin-line)]"
              />
            ) : (
              <div className="flex aspect-[3/4] w-24 items-center justify-center rounded-none bg-[var(--admin-panel-soft)] ring-1 ring-[var(--admin-line)]">
                <ImageIcon className="size-6 text-[var(--admin-ink-muted)]" />
              </div>
            )}
            {hasMultiple ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setImgIdx((i) => (i - 1 + colorImages.length) % colorImages.length)
                  }
                  className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-0.5 shadow ring-1 ring-black/10"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i + 1) % colorImages.length)}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-0.5 shadow ring-1 ring-black/10"
                >
                  <ChevronRight className="size-3.5" />
                </button>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {imgIdx + 1}/{colorImages.length}
                </span>
              </>
            ) : null}
            {currentImg && canDelete ? (
              <button
                type="button"
                onClick={() => onRemoveImage(currentImg.id)}
                className="absolute right-0.5 top-0.5 rounded-none bg-red-600 p-0.5 text-white hover:bg-red-700"
                title="Delete this photo"
              >
                <Trash2 className="size-3" />
              </button>
            ) : null}
          </div>
          {canCreate && firstVariant ? (
            <label className="flex cursor-pointer items-center justify-center gap-1 rounded-none border border-dashed border-[var(--admin-line)] py-1 text-[10px] text-[var(--admin-ink-muted)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)]">
              <Upload className="size-3" />
              Add photo
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((file) => onUpload(firstVariant.id, file));
                  e.target.value = '';
                }}
              />
            </label>
          ) : null}
        </div>

        {/* Sizes table */}
        <div className="min-w-0 flex-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-line)]">
                <th className="pb-2 text-left font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                  Size
                </th>
                <th className="pb-2 text-left font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                  Name
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
                const stock = stockByVariant.get(variant.id) ?? 0;
                const isEditing = editingVariantId === variant.id;
                return (
                  <tr
                    key={variant.id}
                    className="border-[var(--admin-line)]/50 border-b last:border-0"
                  >
                    <td className="py-2 pr-2 font-medium text-[var(--admin-ink)]">
                      {canUpdate ? (
                        <select
                          value={variant.sizeId ?? ''}
                          onChange={(e) => onUpdateSize(variant.id, e.target.value || null)}
                          className="rounded-none border border-[var(--admin-line)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--admin-accent)]"
                        >
                          <option value="">—</option>
                          {sizes.map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={usedSizeIds.has(s.id) && s.id !== variant.sizeId}
                            >
                              {s.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        (sizes.find((s) => s.id === variant.sizeId)?.name ?? '—')
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-none border border-[var(--admin-accent)] bg-white px-2 py-1 text-xs outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onUpdateTitle(variant.id, editTitle);
                              if (e.key === 'Escape') setEditingVariantId(null);
                            }}
                          />
                          <button
                            type="button"
                            className="rounded-none bg-[var(--admin-accent)] px-2 py-1 text-[10px] font-bold text-white"
                            onClick={() => onUpdateTitle(variant.id, editTitle)}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!canUpdate}
                          className="truncate text-left text-[var(--admin-ink-muted)] hover:underline"
                          onClick={() => {
                            setEditingVariantId(variant.id);
                            setEditTitle(variant.title ?? '');
                          }}
                        >
                          {variant.title || <span className="italic opacity-50">add label</span>}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      <input
                        key={`${variant.id}:stock:${stockReady ? stock : 'pending'}`}
                        type="number"
                        min={0}
                        defaultValue={stockReady ? stock : ''}
                        placeholder={stockReady ? undefined : '—'}
                        disabled={!canUpdate || !stockReady}
                        className="w-16 rounded-none border border-[var(--admin-line)] bg-white px-2 py-1 text-center text-xs outline-none focus:border-[var(--admin-accent)] disabled:bg-[var(--admin-panel)]"
                        onBlur={(e) => {
                          if (!stockReady) return;
                          const qty = Number(e.target.value);
                          if (Number.isFinite(qty) && qty !== stock) onSetStock(variant.id, qty);
                        }}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <input
                        key={`${variant.id}:price:${variant.price}:${variant.salePrice ?? ''}`}
                        type="number"
                        min={0}
                        defaultValue={variant.salePrice ?? variant.price}
                        disabled={!canUpdate}
                        className="w-24 rounded-none border border-[var(--admin-line)] bg-white px-2 py-1 text-right text-xs outline-none focus:border-[var(--admin-accent)]"
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (!Number.isFinite(next) || next < 0) return;
                          const current = variant.salePrice ?? variant.price;
                          if (next === current) return;
                          if (variant.salePrice != null && variant.salePrice > 0) {
                            onUpdatePrice(variant.id, variant.price || next, next);
                          } else {
                            onUpdatePrice(variant.id, next, null);
                          }
                        }}
                      />
                    </td>
                    {canDelete ? (
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(variant.id)}
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

          {canCreate && colorKey !== '__no_color__' ? (
            <div className="mt-3 border-t border-[var(--admin-line)] pt-3">
              {addingSizes ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-ink-muted)]">
                    Add more sizes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => {
                      const selected = extraSizeIds.includes(size.id);
                      return (
                        <div key={size.id} className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setExtraSizeIds((prev) =>
                                prev.includes(size.id)
                                  ? prev.filter((id) => id !== size.id)
                                  : [...prev, size.id],
                              )
                            }
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
                              value={extraStockMap[size.id] ?? ''}
                              onChange={(e) =>
                                setExtraStockMap((m) => ({ ...m, [size.id]: e.target.value }))
                              }
                              className="w-14 rounded-none border border-[var(--admin-line)] bg-white px-1.5 py-1 text-center text-xs outline-none focus:border-[var(--admin-accent)]"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                    {!availableSizes.length ? (
                      <p className="text-xs text-[var(--admin-ink-muted)]">
                        All configured sizes are already on this color.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!extraSizeIds.length}
                      onClick={() => {
                        onAddSizes(extraSizeIds, extraStockMap);
                        setAddingSizes(false);
                        setExtraSizeIds([]);
                        setExtraStockMap({});
                      }}
                      className="rounded-none bg-[var(--admin-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-surface)] disabled:opacity-50"
                    >
                      Add sizes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingSizes(false);
                        setExtraSizeIds([]);
                        setExtraStockMap({});
                      }}
                      className="text-xs text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingSizes(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--admin-accent)] hover:underline"
                >
                  <Plus className="size-3.5" /> Add more sizes
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
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
    staleTime: 0,
  });
  const stockQueryKey = QUERY_KEYS.inventory.items({ productId, scope: 'product-editor' });
  const stockQuery = useQuery({
    queryKey: stockQueryKey,
    queryFn: () => inventoryApi.listAllItems({ productId }),
    staleTime: 0,
  });
  const mediaQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
    queryFn: () => mediaApi.list(productId),
    staleTime: 0,
  });
  const sizesQuery = useQuery({
    queryKey: ['cms', 'sizes', 'variant-form'],
    queryFn: () => cmsApi.sizes.list({ limit: 100, status: 'active' }),
    staleTime: 5 * 60_000,
  });
  const colorsQuery = useQuery({
    queryKey: ['cms', 'colors', 'variant-form'],
    queryFn: () => cmsApi.colors.list({ limit: 100, status: 'active' }),
    staleTime: 5 * 60_000,
  });

  const variants = variantsQuery.data ?? [];
  const stockRows = stockQuery.data ?? [];
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

  const extractStockVariantId = (row: Record<string, unknown>): string => {
    if (typeof row.variantId === 'string') return row.variantId;
    if (row.variantId && typeof row.variantId === 'object') {
      const v = row.variantId as { _id?: unknown; id?: unknown };
      return String(v._id ?? v.id ?? '');
    }
    // Fallback for a populated `variant` relation.
    const variant = (row as { variant?: { id?: unknown; _id?: unknown } }).variant;
    if (variant && typeof variant === 'object') {
      return String(variant._id ?? variant.id ?? '');
    }
    return '';
  };

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockRows) {
      const vid = extractStockVariantId(row as unknown as Record<string, unknown>);
      if (!vid) continue;
      map.set(vid, (map.get(vid) ?? 0) + Number(row.quantityOnHand ?? 0));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products.detail(productId),
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'variants'],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
        refetchType: 'active',
      }),
      queryClient.invalidateQueries({ queryKey: stockQueryKey, refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'], refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'active' }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newColorId) throw new AppError('Select a color first.');
      const basePrice = Number(newPrice);
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        throw new AppError('Enter a price greater than 0 before adding the variant.');
      }
      const sizeOptions = newSizeIds.length ? newSizeIds : [''];
      const baseSale = newSalePrice === '' ? null : Number(newSalePrice);
      const existingKeys = new Set(variants.map((v) => `${v.colorId ?? ''}:${v.sizeId ?? ''}`));
      let created = 0;
      const stockFailures: string[] = [];
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
        const stockQty = Number(newStockMap[sizeId] ?? newStockMap[''] ?? 0);
        if (Number.isFinite(stockQty) && stockQty >= 0) {
          try {
            await inventoryApi.setStock({ variantId: variant.id, quantity: stockQty });
          } catch (err) {
            stockFailures.push(
              err instanceof AppError ? err.message : `Stock failed for ${sizeName ?? 'size'}`,
            );
          }
        }
        created++;
      }
      if (!created) throw new AppError('These variants already exist.');
      return { created, stockFailures };
    },
    onSuccess: async ({ created, stockFailures }) => {
      toast.success(`${created} variant${created !== 1 ? 's' : ''} added`);
      if (stockFailures.length) {
        toast.error(`Stock not saved: ${stockFailures[0]}`, { duration: 8000 });
      }
      setAddingColor(false);
      setNewColorId('');
      setNewSizeIds([]);
      setNewStockMap({});
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      const msg = err instanceof AppError ? err.message : 'Unable to add variants.';
      setError(msg);
      toast.error(msg);
    },
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
    mutationFn: async (variantId: string) => {
      await productsApi.updateVariant(variantId, { isDefault: true });
      // Auto-set primary image to match the default variant's first image
      const variantImages = variantMediaMap.get(variantId) ?? [];
      if (variantImages[0]) {
        try {
          await mediaApi.setPrimary(variantImages[0].id);
        } catch {
          /* non-critical */
        }
      }
    },
    onSuccess: async () => {
      toast.success('Default variant updated — catalog will show this color first');
      await invalidate();
    },
  });

  const setStockMutation = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      inventoryApi.setStock({ variantId, quantity }),
    onMutate: async ({ variantId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: stockQueryKey });
      const previous = queryClient.getQueryData<InventoryItemRow[]>(stockQueryKey);
      queryClient.setQueryData(stockQueryKey, (old: InventoryItemRow[] | undefined) => {
        const rows = old ?? [];
        const found = rows.some(
          (row) => extractStockVariantId(row as unknown as Record<string, unknown>) === variantId,
        );
        if (found) {
          return rows.map((row) =>
            extractStockVariantId(row as unknown as Record<string, unknown>) === variantId
              ? { ...row, quantityOnHand: quantity, quantityAvailable: quantity }
              : row,
          );
        }
        return [
          ...rows,
          {
            id: `tmp-${variantId}`,
            productId,
            variantId,
            warehouseId: '',
            quantityOnHand: quantity,
            quantityReserved: 0,
            quantityAvailable: quantity,
          },
        ];
      });
      return { previous };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stockQueryKey });
      toast.success('Stock updated');
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(stockQueryKey, context.previous);
      }
      toast.error(
        err instanceof AppError
          ? err.message
          : 'Unable to update stock. Check inventory permissions.',
      );
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({
      id,
      price,
      salePrice,
    }: {
      id: string;
      price: number;
      salePrice: number | null;
    }) => productsApi.updateVariant(id, { price, salePrice }),
    onSuccess: async () => {
      toast.success('Price updated');
      await invalidate();
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to update price'),
  });

  const updateSizeMutation = useMutation({
    mutationFn: ({ id, sizeId }: { id: string; sizeId: string | null }) => {
      const variant = variants.find((v) => v.id === id);
      const colorName = variant?.colorId
        ? colors.find((c) => c.id === variant.colorId)?.name
        : undefined;
      const sizeName = sizeId ? sizes.find((s) => s.id === sizeId)?.name : undefined;
      const title = [colorName, sizeName].filter(Boolean).join(' / ') || undefined;
      return productsApi.updateVariant(id, {
        sizeId,
        title,
        price: variant?.price ?? productPrice,
      });
    },
    onSuccess: async () => {
      toast.success('Size updated');
      await invalidate();
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to update size'),
  });

  const changeColorMutation = useMutation({
    mutationFn: async ({
      fromColorId,
      toColorId,
      groupVariants,
    }: {
      fromColorId: string | null;
      toColorId: string;
      groupVariants: AdminVariant[];
    }) => {
      if (!groupVariants.length) return;
      const colorName = colors.find((c) => c.id === toColorId)?.name;
      const [first, ...rest] = groupVariants;
      await productsApi.updateVariant(first!.id, {
        colorId: toColorId,
        cascadeColorToSiblings: Boolean(fromColorId),
        title:
          [colorName, sizes.find((s) => s.id === first!.sizeId)?.name]
            .filter(Boolean)
            .join(' / ') || undefined,
        price: first!.price,
      });
      // If cascading from a real color, siblings are updated server-side.
      // For "No color" groups, update each row individually.
      if (!fromColorId) {
        for (const v of rest) {
          const sizeName = v.sizeId ? sizes.find((s) => s.id === v.sizeId)?.name : undefined;
          await productsApi.updateVariant(v.id, {
            colorId: toColorId,
            title: [colorName, sizeName].filter(Boolean).join(' / ') || undefined,
            price: v.price,
          });
        }
      } else {
        for (const v of rest) {
          const sizeName = v.sizeId ? sizes.find((s) => s.id === v.sizeId)?.name : undefined;
          await productsApi.updateVariant(v.id, {
            title: [colorName, sizeName].filter(Boolean).join(' / ') || undefined,
            price: v.price,
          });
        }
      }
    },
    onSuccess: async () => {
      toast.success('Color updated');
      await invalidate();
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to change color'),
  });

  const addSizesToColorMutation = useMutation({
    mutationFn: async ({
      colorId,
      sizeIds,
      stockMap,
      basePrice,
      baseSale,
    }: {
      colorId: string;
      sizeIds: string[];
      stockMap: Record<string, string>;
      basePrice: number;
      baseSale: number | null;
    }) => {
      const colorName = colors.find((c) => c.id === colorId)?.name;
      const existingKeys = new Set(variants.map((v) => `${v.colorId ?? ''}:${v.sizeId ?? ''}`));
      let created = 0;
      for (const sizeId of sizeIds) {
        const key = `${colorId}:${sizeId}`;
        if (existingKeys.has(key)) continue;
        const sizeName = sizes.find((s) => s.id === sizeId)?.name;
        const variant = await productsApi.createVariant(productId, {
          title: [colorName, sizeName].filter(Boolean).join(' / ') || undefined,
          colorId,
          sizeId,
          price: basePrice,
          salePrice: baseSale,
          currency: 'LKR',
        });
        const stockQty = Number(stockMap[sizeId] ?? 0);
        if (Number.isFinite(stockQty) && stockQty >= 0) {
          await inventoryApi.setStock({ variantId: variant.id, quantity: stockQty });
        }
        created++;
      }
      if (!created) throw new AppError('Those sizes already exist on this color.');
      return created;
    },
    onSuccess: async (created) => {
      toast.success(`${created} size${created !== 1 ? 's' : ''} added`);
      await invalidate();
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to add sizes'),
  });

  const listSeparatelyMutation = useMutation({
    mutationFn: ({ id, listSeparately }: { id: string; listSeparately: boolean }) =>
      productsApi.updateVariant(id, { listSeparately }),
    onSuccess: async (_, vars) => {
      toast.success(
        vars.listSeparately
          ? 'This color will appear as its own catalog card'
          : 'Removed from separate catalog listing',
      );
      await invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof AppError ? err.message : 'Unable to update listing'),
  });

  const removeMediaMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.remove(mediaId),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to delete image'),
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
    onSuccess: () => {
      toast.success('Photo added');
      invalidate();
    },
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
      {stockQuery.isError ? (
        <div className="flex items-center justify-between gap-3 border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>
            Stock could not be loaded, so quantities are hidden to avoid overwriting them.
          </span>
          <button
            type="button"
            className="shrink-0 border border-red-400 px-2 py-1 font-bold uppercase tracking-wide"
            onClick={() => stockQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Existing variant groups */}
      {[...colorGroups.entries()].map(([colorKey, colorVariants]) => {
        const colorLabel =
          colorKey === '__no_color__'
            ? 'No color'
            : (colors.find((c) => c.id === colorKey)?.name ?? colorKey);
        const firstVariant = colorVariants[0] as AdminVariant | undefined;
        const colorImages = colorVariants.flatMap((v) => variantMediaMap.get(v.id) ?? []);
        const isDefault = colorVariants.some((v) => v.isDefault);
        const isOwnListing = colorVariants.some((v) => v.listSeparately);

        return (
          <ColorVariantCard
            key={colorKey}
            colorKey={colorKey}
            colorLabel={colorLabel}
            colorVariants={colorVariants}
            colorImages={colorImages}
            firstVariant={firstVariant}
            isDefault={isDefault}
            isOwnListing={isOwnListing}
            sizes={sizes}
            colors={colors}
            stockByVariant={stockByVariant}
            stockReady={stockQuery.isSuccess}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            editingVariantId={editingVariantId}
            editTitle={editTitle}
            setEditingVariantId={setEditingVariantId}
            setEditTitle={setEditTitle}
            onSetDefault={(id) => setDefaultMutation.mutate(id)}
            onToggleOwnListing={(id, next) =>
              listSeparatelyMutation.mutate({ id, listSeparately: next })
            }
            onUpload={(variantId, file) => uploadVariantImageMutation.mutate({ variantId, file })}
            onRemoveImage={(mediaId) => removeMediaMutation.mutate(mediaId)}
            onUpdateTitle={(id, title) => updateTitleMutation.mutate({ id, title })}
            onSetStock={(variantId, quantity) => setStockMutation.mutate({ variantId, quantity })}
            onUpdatePrice={(id, price, salePrice) =>
              updatePriceMutation.mutate({ id, price, salePrice })
            }
            onUpdateSize={(id, sizeId) => updateSizeMutation.mutate({ id, sizeId })}
            onChangeColor={(toColorId) =>
              changeColorMutation.mutate({
                fromColorId: colorKey === '__no_color__' ? null : colorKey,
                toColorId,
                groupVariants: colorVariants,
              })
            }
            onAddSizes={(sizeIds, stockMap) => {
              if (!firstVariant || colorKey === '__no_color__') return;
              addSizesToColorMutation.mutate({
                colorId: colorKey,
                sizeIds,
                stockMap,
                basePrice: firstVariant.price || productPrice || 0,
                baseSale: firstVariant.salePrice ?? productSalePrice ?? null,
              });
            }}
            onDelete={(id) => {
              if (confirm('Remove this variant?')) deleteMutation.mutate(id);
            }}
          />
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
          onClick={() => {
            setAddingColor(true);
            setNewPrice(String(productPrice || ''));
            setNewSalePrice(productSalePrice ? String(productSalePrice) : '');
          }}
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

const SPEC_VALUE_HINTS: Record<string, string> = {
  Fit: 'e.g. Slim Fit, Regular, Oversized',
  Neckline: 'e.g. Round Neck, V-Neck, Collar',
  Pattern: 'e.g. Plain, Printed, Striped',
  'Sleeve length': 'e.g. Short Sleeves, Full Sleeves, Sleeveless',
  Length: 'e.g. Regular, Cropped, Longline, Midi',
  Rise: 'e.g. Mid Rise, High Rise, Low Rise',
  Closure: 'e.g. Button, Zip, Hook & Eye, Pull-on',
  'Fabric care': 'e.g. Machine Wash, Hand Wash, Do not iron on print',
  'Country of origin': 'e.g. India, Sri Lanka, Bangladesh',
};

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
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [occasionIds, setOccasionIds] = useState<string[]>([]);

  // Fetch CMS data
  const categoriesQuery = useQuery({
    queryKey: ['cms', 'categories', 'product-form'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // API zod max for list `limit` is 100 — higher values 400 and leave the picker empty.
      const result = await cmsApi.categories.list({
        limit: 100,
        sortBy: 'sortOrder',
        sortOrder: 'asc',
      });
      const active = result.data.filter(
        (row) => !row.status || row.status === 'active' || row.status === 'published',
      );
      return { ...result, data: active.length ? active : result.data };
    },
  });
  const brandsQuery = useQuery({
    queryKey: ['cms', 'brands', 'product-form'],
    staleTime: 5 * 60_000,
    queryFn: () => cmsApi.brands.list({ limit: 100, status: 'active' }),
  });
  const officialBrandId = useMemo(
    () => findOfficialBrandId(brandsQuery.data?.data ?? []),
    [brandsQuery.data?.data],
  );
  const occasionsQuery = useQuery({
    queryKey: ['cms', 'occasions', 'product-form'],
    staleTime: 5 * 60_000,
    queryFn: () => cmsApi.occasions.list({ limit: 100, status: 'active' }),
  });
  const materialsQuery = useQuery({
    queryKey: ['cms', 'materials', 'product-form'],
    staleTime: 5 * 60_000,
    queryFn: () => cmsApi.materials.list({ limit: 100, status: 'active' }),
  });

  // Fetch product (edit mode)
  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.products.detail(productId ?? ''),
    queryFn: () => productsApi.getById(productId!),
    enabled: isEdit,
    staleTime: 0,
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
      brandId: officialBrandId || '',
      materialId: '',
      gender: 'women',
      tags: '',
      price: '',
      salePrice: '',
      compareAtPrice: '',
      isFeatured: false,
      isTrending: false,
      isMoreToLove: false,
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
      brandId: product.brandId || officialBrandId || '',
      materialId: product.materialId ?? '',
      gender: 'women',
      tags: product.tags?.join(', ') ?? '',
      price: product.price ? String(product.price) : '',
      salePrice: product.salePrice ? String(product.salePrice) : '',
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      isFeatured: product.isFeatured ?? false,
      isTrending: product.isTrending ?? false,
      isMoreToLove: product.isMoreToLove ?? false,
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
    if (product.categoryIds?.length) {
      setCategoryIds(product.categoryIds);
    } else if (product.categoryId) {
      setCategoryIds([product.categoryId]);
    }
    if (product.occasionIds?.length) setOccasionIds(product.occasionIds);
  }, [product, reset, officialBrandId]);

  const brandIdVal = watch('brandId');

  // Always default new (and brand-less) products to the house brand.
  useEffect(() => {
    if (!officialBrandId) return;
    if (!brandIdVal) {
      setValue('brandId', officialBrandId, { shouldDirty: false });
    }
  }, [officialBrandId, brandIdVal, setValue]);

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
    categoryId: categoryIds[0] || undefined,
    categoryIds: categoryIds.length ? categoryIds : undefined,
    subcategoryId: undefined,
    brandId: data.brandId || undefined,
    materialId: data.materialId || undefined,
    gender: 'women',
    occasionIds,
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
    isMoreToLove: data.isMoreToLove,
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
      navigate({ to: ADMIN_ROUTES.productDetail, params: { productId: created.id } });
    },
    onError: (err) =>
      toast.error(err instanceof AppError ? err.message : 'Unable to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProductFormValues) => productsApi.update(productId!, buildPayload(data)),
    onSuccess: async () => {
      toast.success('Product saved');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'], refetchType: 'active' }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.detail(productId!),
          refetchType: 'active',
        }),
      ]);
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to save product'),
  });

  const publishMutation = useMutation({
    mutationFn: () => productsApi.publish(productId!),
    onSuccess: async () => {
      toast.success('Product published');
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.products.detail(productId!),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'active' }),
      ]);
    },
    onError: (err) => toast.error(err instanceof AppError ? err.message : 'Unable to publish'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.remove(productId!),
    onSuccess: async () => {
      toast.success('Product deleted');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate({ to: ADMIN_ROUTES.products });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    if (isEdit) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const categories = categoriesQuery.data?.data ?? [];
  const brands = brandsQuery.data?.data ?? [];
  const occasions = occasionsQuery.data?.data ?? [];
  const materials = materialsQuery.data?.data ?? [];

  const categoryTree = useMemo(() => {
    const OWNER_ROOT_SLUGS = [
      'all-tops',
      'all-bottoms',
      'all-dresses',
      'co-ords',
      'all-footwear',
    ] as const;
    const OWNER_ROOT_SET = new Set<string>(OWNER_ROOT_SLUGS);

    type Node = CategoryPickerNode & { sortOrder: number };
    const map = new Map<string, Node>();

    for (const row of categories) {
      const parentRaw = row.parentId as unknown;
      let parentId: string | null = null;
      if (parentRaw != null && parentRaw !== '') {
        if (typeof parentRaw === 'object' && parentRaw !== null) {
          const record = parentRaw as { _id?: unknown; id?: unknown };
          parentId = String(record._id ?? record.id ?? '');
          if (!parentId || parentId === 'undefined') parentId = null;
        } else {
          parentId = String(parentRaw);
        }
      }

      map.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug ?? '',
        parentId,
        children: [],
        sortOrder: Number(row.sortOrder ?? 0),
      });
    }

    // Also link by path when parentId is missing (e.g. /all-tops/long-sleeves).
    const bySlug = new Map([...map.values()].map((node) => [node.slug, node]));
    for (const row of categories) {
      const node = map.get(row.id);
      if (!node || node.parentId) continue;
      const path = typeof row.path === 'string' ? row.path : '';
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const parentSlug = parts[parts.length - 2];
        const parent = parentSlug ? bySlug.get(parentSlug) : undefined;
        if (parent && parent.id !== node.id) node.parentId = parent.id;
      }
    }

    const roots: Node[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (list: Node[]) => {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      for (const item of list) {
        if (item.children?.length) sortNodes(item.children as Node[]);
      }
    };
    sortNodes(roots);

    const ownerRoots = OWNER_ROOT_SLUGS.map((slug) => roots.find((r) => r.slug === slug)).filter(
      (node): node is Node => Boolean(node),
    );
    if (ownerRoots.length) return ownerRoots;

    // Fallback: any roots that look like the owner catalog, else all non-campaign roots.
    const filtered = roots.filter((root) => OWNER_ROOT_SET.has(root.slug));
    if (filtered.length) return filtered;
    return roots.filter((root) => !['new-arrivals', 'oversized'].includes(root.slug));
  }, [categories]);

  const flatCategoryOptions = useMemo(
    () =>
      categories.map((row) => {
        const parentRaw = row.parentId as unknown;
        let parentId: string | null = null;
        if (parentRaw != null && parentRaw !== '') {
          parentId =
            typeof parentRaw === 'object' && parentRaw !== null
              ? String(
                  (parentRaw as { _id?: unknown; id?: unknown })._id ??
                    (parentRaw as { id?: unknown }).id ??
                    '',
                )
              : String(parentRaw);
          if (!parentId || parentId === 'undefined') parentId = null;
        }
        return {
          id: row.id,
          name: row.name,
          slug: row.slug ?? '',
          parentId,
        };
      }),
    [categories],
  );

  if (isEdit && detailQuery.isLoading) {
    return (
      <PageMotion>
        <div className="flex items-center justify-center py-24 text-[var(--admin-ink-muted)]">
          <Loader2 className="size-6 animate-spin" />
        </div>
      </PageMotion>
    );
  }

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

            {/* Variants — only in edit mode */}
            {isEdit && productId ? (
              <div className={cardCls}>
                <div className="-mt-1 mb-1 flex items-center justify-between">
                  <p className={sectionTitleCls}>Color &amp; size variants</p>
                  <span className="text-xs text-[var(--admin-ink-muted)]">
                    Photos · sizes · stock · price — all per color
                  </span>
                </div>
                <p className="mb-4 text-xs text-[var(--admin-ink-muted)]">
                  <strong>Default listing</strong> color&apos;s first photo is what shoppers see on
                  the catalog. Turn on <strong>Own listing</strong> for another color to show it as
                  a separate product card too.
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
                  Variants after saving
                </p>
                <p className="mt-1 text-xs text-[var(--admin-ink-muted)]">
                  Create the product first, then add colors, photos, sizes, and stock.
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
                        placeholder={SPEC_VALUE_HINTS[row.name] ?? 'Enter value…'}
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
              {w.price &&
              w.salePrice &&
              Number(w.salePrice) > 0 &&
              Number(w.salePrice) < Number(w.price) ? (
                <p className="text-[11px] text-[var(--admin-ink-muted)]">
                  Discount:{' '}
                  <strong className="text-[var(--admin-accent)]">
                    {Math.round(((Number(w.price) - Number(w.salePrice)) / Number(w.price)) * 100)}%
                    off
                  </strong>
                </p>
              ) : null}
            </SidebarCard>

            {/* Category & Placement */}
            <SidebarCard title="Category & Where it appears">
              <div>
                <p className={labelCls}>Category — select all that apply</p>
                <p className="mb-2 text-[11px] text-[var(--admin-ink-muted)]">
                  Search and pick styles. Parents like All Tops are attached automatically. First
                  selected = primary.
                </p>
                <CategoryTreePicker
                  nodes={categoryTree}
                  flatOptions={flatCategoryOptions}
                  selectedIds={categoryIds}
                  onChange={setCategoryIds}
                />
                {categoryIds.length > 0 ? (
                  <p className="mt-1 text-[11px] text-[var(--admin-accent)]">
                    {categoryIds.length} selected · Primary:{' '}
                    {categories.find((c) => c.id === categoryIds[0])?.name ?? categoryIds[0]}
                  </p>
                ) : null}
              </div>

              <Field label="Gender">
                <select {...register('gender')} className={fieldCls}>
                  <option value="women">Women</option>
                </select>
                <p className="mt-1 text-[11px] text-[var(--admin-ink-muted)]">
                  This store sells women’s products only — Women is preselected.
                </p>
              </Field>

              <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-ink-muted)]">
                Homepage sections
              </p>
              <PlacementToggle
                label="Best Seller"
                description="Shows in the Best Sellers row on the home page"
                checked={w.isBestSeller ?? false}
                onChange={(v) => setFlag('isBestSeller', v)}
              />
              <PlacementToggle
                label="More To Love"
                description="Shows in the More to love row on the home page"
                checked={w.isMoreToLove ?? false}
                onChange={(v) => setFlag('isMoreToLove', v)}
              />
              <PlacementToggle
                label="Featured Product of home page"
                description="Shows in the Featured products grid on the home page"
                checked={w.isFeatured ?? false}
                onChange={(v) => setFlag('isFeatured', v)}
              />
            </SidebarCard>

            {/* Product details */}
            <SidebarCard title="Product details" defaultOpen={false}>
              <Field label="Brand">
                <select {...register('brandId')} className={fieldCls}>
                  {!officialBrandId ? <option value="">— No brand —</option> : null}
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.id === officialBrandId ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[var(--admin-ink-muted)]">
                  Default brand is {OFFICIAL_BRAND_NAME}.
                </p>
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
              {/* Occasions multi-select */}
              <div>
                <p className={labelCls}>Occasion — select all that apply</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {occasions.map((o) => {
                    const selected = occasionIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() =>
                          setOccasionIds((prev) =>
                            selected ? prev.filter((id) => id !== o.id) : [...prev, o.id],
                          )
                        }
                        className={cn(
                          'rounded-none border px-3 py-1 text-xs font-semibold transition-colors',
                          selected
                            ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white'
                            : 'hover:border-[var(--admin-accent)]/60 border-[var(--admin-line)] text-[var(--admin-ink)]',
                        )}
                      >
                        {o.name}
                      </button>
                    );
                  })}
                  {!occasions.length ? (
                    <p className="text-xs text-[var(--admin-ink-muted)]">
                      No occasions configured.
                    </p>
                  ) : null}
                </div>
              </div>
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
