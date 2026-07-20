import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminEmptyState, AdminPanel } from '@/components/admin';
import { ImageUploader } from '@/components/admin/image-uploader';
import { QUERY_KEYS } from '@/constants';
import { formatCurrency } from '@/lib/utils';
import { AppError } from '@/lib/errors';
import { nextLinkedSku } from '@/lib/sku';
import { inventoryApi, mediaApi, productsApi, type AdminVariant } from '@/services';

const fieldClass =
  'w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]/50';

const btnPrimary =
  'inline-flex h-9 items-center justify-center rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-medium text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60';
const btnDanger =
  'inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10';

export type ProductSection = 'details' | 'images' | 'variants' | 'prices' | 'stock' | 'review';

export function ProductCommercePanels({
  productId,
  productSku,
  productName,
  section = 'details',
  canUpdate,
  canCreate,
  canDelete,
  canAdjustStock,
  canPublish,
  isPublished,
  isPublishing,
  onPublish,
}: {
  productId: string;
  productSku?: string;
  productName: string;
  section?: ProductSection;
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canAdjustStock: boolean;
  canPublish: boolean;
  isPublished: boolean;
  isPublishing: boolean;
  onPublish: () => void;
}) {
  const queryClient = useQueryClient();
  const variantsQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.detail(productId), 'variants'],
    queryFn: () => productsApi.listVariants(productId),
  });
  const warehousesQuery = useQuery({
    queryKey: QUERY_KEYS.inventory.warehouses(),
    queryFn: () => inventoryApi.listWarehouses(),
  });
  const stockQuery = useQuery({
    queryKey: QUERY_KEYS.inventory.items({ productId, limit: 100 }),
    queryFn: () => inventoryApi.listItems({ productId, limit: 100 }),
  });
  const mediaQuery = useQuery({
    queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
    queryFn: () => mediaApi.list(productId),
  });

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<
    Record<string, { price: string; salePrice: string }>
  >({});
  const [stockDrafts, setStockDrafts] = useState<
    Record<string, { warehouseId: string; quantity: string; direction: 'increase' | 'decrease' }>
  >({});

  const variants = variantsQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];
  const stockRows = stockQuery.data?.data ?? [];
  const media = mediaQuery.data ?? [];
  const mainImages = useMemo(() => media.filter((item) => !item.variantId), [media]);
  const variantMediaMap = useMemo(() => {
    const map = new Map<string, typeof media>();
    for (const item of media) {
      if (!item.variantId) continue;
      map.set(item.variantId, [...(map.get(item.variantId) ?? []), item]);
    }
    return map;
  }, [media]);

  useEffect(() => {
    const next: Record<string, { price: string; salePrice: string }> = {};
    for (const variant of variants) {
      next[variant.id] = {
        price: String(variant.price ?? 0),
        salePrice: variant.salePrice == null ? '' : String(variant.salePrice),
      };
    }
    setPriceDrafts(next);
  }, [variants]);

  useEffect(() => {
    const id = section === 'details' ? null : `product-section-${section}`;
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [section, variantsQuery.isFetched, stockQuery.isFetched, mediaQuery.isFetched]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
      }),
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'variants'],
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.inventory.items({ productId, limit: 100 }),
      }),
    ]);
  };

  const uploadMainMutation = useMutation({
    mutationFn: (file: File) =>
      mediaApi.upload(productId, file, { isPrimary: mainImages.length === 0 }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.products.detail(productId), 'media'],
      });
      await invalidate();
    },
    onError: (err) => setError(err instanceof AppError ? err.message : 'Unable to upload image.'),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.setPrimary(mediaId),
    onSuccess: () => invalidate(),
  });

  const removeMediaMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.remove(mediaId),
    onSuccess: () => invalidate(),
  });

  const uploadVariantImageMutation = useMutation({
    mutationFn: ({ variantId, file }: { variantId: string; file: File }) =>
      mediaApi.upload(productId, file, { variantId }),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) =>
      setError(err instanceof AppError ? err.message : 'Unable to upload variant image.'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      productsApi.createVariant(productId, {
        title: title.trim() || undefined,
        price: Number(price) || 0,
        salePrice: salePrice === '' ? null : Number(salePrice),
        currency: 'LKR',
      }),
    onSuccess: async () => {
      setTitle('');
      setPrice('0');
      setSalePrice('');
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof AppError ? err.message : 'Unable to create variant.');
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: (variant: AdminVariant) => {
      const draft = priceDrafts[variant.id];
      return productsApi.updateVariant(variant.id, {
        price: Number(draft?.price ?? variant.price) || 0,
        salePrice: !draft?.salePrice ? null : Number(draft.salePrice),
      });
    },
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof AppError ? err.message : 'Unable to update price.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: string) => productsApi.removeVariant(variantId),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof AppError ? err.message : 'Unable to delete variant.');
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const draft = stockDrafts[variantId];
      const warehouseId = draft?.warehouseId || warehouses[0]?.id;
      const quantity = Number(draft?.quantity ?? 0);
      const direction = draft?.direction ?? 'increase';
      if (!warehouseId) throw new AppError('Create a warehouse first.');
      if (!quantity || quantity < 1) throw new AppError('Enter a positive quantity.');

      const existing = stockRows.find(
        (row) => row.variantId === variantId && row.warehouseId === warehouseId,
      );

      if (!existing) {
        if (direction === 'decrease') {
          throw new AppError('No stock record yet — increase stock first.');
        }
        await inventoryApi.createItem({ warehouseId, variantId, onHand: quantity });
        return;
      }

      await inventoryApi.adjust({
        warehouseId,
        variantId,
        quantity,
        direction,
        reason: 'Admin product stock adjustment',
      });
    },
    onSuccess: async (_, variantId) => {
      setStockDrafts((current) => ({
        ...current,
        [variantId]: {
          warehouseId: current[variantId]?.warehouseId || warehouses[0]?.id || '',
          quantity: '1',
          direction: 'increase',
        },
      }));
      setError(null);
      await invalidate();
      await stockQuery.refetch();
    },
    onError: (err) => {
      setError(err instanceof AppError ? err.message : 'Unable to adjust stock.');
    },
  });

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockRows) {
      if (!row.variantId) continue;
      map.set(row.variantId, (map.get(row.variantId) ?? 0) + row.quantityAvailable);
    }
    return map;
  }, [stockRows]);

  const nextVariantSku = useMemo(() => {
    if (!productSku) return null;
    try {
      return nextLinkedSku(
        productSku,
        variants.map((variant) => variant.sku),
      );
    } catch {
      return null;
    }
  }, [productSku, variants]);

  // If parent isn't an FE* sku yet (legacy data), hide a fake preview.
  const canPreviewSku = Boolean(productSku && /^FE\d+$/i.test(productSku));
  const previewSku = canPreviewSku ? nextVariantSku : null;

  const highlight = (name: ProductSection) =>
    section === name ? 'ring-2 ring-[var(--admin-accent)]/35' : '';

  const hasMainImage = mainImages.length > 0;
  const hasVariants = variants.length > 0;
  const readyToPublish = hasMainImage && hasVariants;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <AdminPanel title="Product images">
        <div id="product-section-images" className={highlight('images')}>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            The first image becomes the main listing photo. At least one image is required.
          </p>
          <ImageUploader
            images={mainImages}
            required
            disabled={!canUpdate}
            uploading={uploadMainMutation.isPending}
            onUpload={(file) => uploadMainMutation.mutate(file)}
            onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
            onRemove={(id) => removeMediaMutation.mutate(id)}
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Variants">
        <div id="product-section-variants" className={highlight('variants')}>
          {canCreate ? (
            <form
              className="mb-5 space-y-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Next variant SKU
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold tracking-wide text-[var(--admin-ink)]">
                    {previewSku ?? 'Assigned on save'}
                  </p>
                </div>
                {canPreviewSku && productSku ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Linked to parent <span className="font-mono">{productSku}</span>
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Linked FE2026 sequence assigned automatically
                  </p>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                <input
                  className={fieldClass}
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
                <button type="submit" className={btnPrimary} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding…' : 'Add variant'}
                </button>
              </div>
            </form>
          ) : null}

          {variantsQuery.isLoading ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading variants…</p>
          ) : variants.length === 0 ? (
            <AdminEmptyState
              title="No variants yet"
              description="Add a SKU and price to create the first sellable variant."
            />
          ) : (
            <ul className="divide-y divide-[var(--admin-line)]">
              {variants.map((variant) => {
                const variantImages = variantMediaMap.get(variant.id) ?? [];
                return (
                  <li
                    key={variant.id}
                    className="flex flex-wrap items-start justify-between gap-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <ImageUploader
                        images={variantImages}
                        required
                        compact
                        disabled={!canUpdate}
                        uploading={
                          uploadVariantImageMutation.isPending &&
                          uploadVariantImageMutation.variables?.variantId === variant.id
                        }
                        onUpload={(file) =>
                          uploadVariantImageMutation.mutate({ variantId: variant.id, file })
                        }
                        onRemove={(id) => removeMediaMutation.mutate(id)}
                      />
                      <div>
                        <p className="font-medium text-[var(--admin-ink)]">
                          {variant.title || variant.sku}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {variant.sku}
                          {variant.isDefault ? ' · default' : ''} · stock{' '}
                          {stockByVariant.get(variant.id) ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatCurrency(variant.price, variant.currency)}
                      </span>
                      {canDelete ? (
                        <button
                          type="button"
                          className={btnDanger}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete variant ${variant.sku}?`)) {
                              deleteMutation.mutate(variant.id);
                            }
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Prices">
        <div id="product-section-prices" className={highlight('prices')}>
          {variants.length === 0 ? (
            <AdminEmptyState
              title="Add a variant first"
              description="Prices are edited per variant SKU."
            />
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="grid gap-3 rounded-xl border border-[var(--admin-line)] p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-medium">{variant.title || variant.sku}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{variant.sku}</p>
                  </div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                    Price
                    <input
                      className={`${fieldClass} mt-1`}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canUpdate}
                      value={priceDrafts[variant.id]?.price ?? String(variant.price)}
                      onChange={(event) =>
                        setPriceDrafts((current) => ({
                          ...current,
                          [variant.id]: {
                            price: event.target.value,
                            salePrice: current[variant.id]?.salePrice ?? '',
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                    Sale price
                    <input
                      className={`${fieldClass} mt-1`}
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canUpdate}
                      value={priceDrafts[variant.id]?.salePrice ?? ''}
                      onChange={(event) =>
                        setPriceDrafts((current) => ({
                          ...current,
                          [variant.id]: {
                            price: current[variant.id]?.price ?? String(variant.price),
                            salePrice: event.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  {canUpdate ? (
                    <button
                      type="button"
                      className={`${btnPrimary} self-end`}
                      disabled={updatePriceMutation.isPending}
                      onClick={() => updatePriceMutation.mutate(variant)}
                    >
                      Save
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Stock">
        <div id="product-section-stock" className={highlight('stock')}>
          {variants.length === 0 ? (
            <AdminEmptyState
              title="Add a variant first"
              description="Stock is tracked per variant and warehouse."
            />
          ) : warehouses.length === 0 ? (
            <AdminEmptyState
              title="No warehouses"
              description="Create a warehouse in Inventory before adjusting stock."
            />
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => {
                const draft = stockDrafts[variant.id] ?? {
                  warehouseId: warehouses[0]?.id ?? '',
                  quantity: '1',
                  direction: 'increase' as const,
                };
                return (
                  <div
                    key={variant.id}
                    className="grid gap-3 rounded-xl border border-[var(--admin-line)] p-4 md:grid-cols-[1.1fr_1fr_1fr_1fr_auto]"
                  >
                    <div>
                      <p className="text-sm font-medium">{variant.title || variant.sku}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Available: {stockByVariant.get(variant.id) ?? 0}
                      </p>
                    </div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                      Warehouse
                      <select
                        className={`${fieldClass} mt-1`}
                        disabled={!canAdjustStock}
                        value={draft.warehouseId}
                        onChange={(event) =>
                          setStockDrafts((current) => ({
                            ...current,
                            [variant.id]: { ...draft, warehouseId: event.target.value },
                          }))
                        }
                      >
                        {warehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                      Qty
                      <input
                        className={`${fieldClass} mt-1`}
                        type="number"
                        min="1"
                        disabled={!canAdjustStock}
                        value={draft.quantity}
                        onChange={(event) =>
                          setStockDrafts((current) => ({
                            ...current,
                            [variant.id]: { ...draft, quantity: event.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                      Direction
                      <select
                        className={`${fieldClass} mt-1`}
                        disabled={!canAdjustStock}
                        value={draft.direction}
                        onChange={(event) =>
                          setStockDrafts((current) => ({
                            ...current,
                            [variant.id]: {
                              ...draft,
                              direction: event.target.value as 'increase' | 'decrease',
                            },
                          }))
                        }
                      >
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                    </label>
                    {canAdjustStock ? (
                      <button
                        type="button"
                        className={`${btnPrimary} self-end`}
                        disabled={adjustMutation.isPending}
                        onClick={() => adjustMutation.mutate(variant.id)}
                      >
                        Apply
                      </button>
                    ) : (
                      <span className="self-end text-xs text-neutral-500 dark:text-neutral-400">
                        View only
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Review & publish">
        <div id="product-section-review" className={highlight('review')}>
          <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
            Everything below must be complete before <strong>{productName}</strong> can go live.
          </p>
          <ul className="space-y-2 text-sm">
            <ChecklistItem ok={hasMainImage} label="At least one product image" />
            <ChecklistItem ok={hasVariants} label="At least one variant with price" />
          </ul>

          {canPublish ? (
            <button
              type="button"
              className={`${btnPrimary} mt-5`}
              disabled={isPublishing || (!isPublished && !readyToPublish)}
              onClick={onPublish}
              title={
                !readyToPublish && !isPublished
                  ? 'Complete the checklist above to publish'
                  : undefined
              }
            >
              {isPublished ? 'Published' : isPublishing ? 'Publishing…' : 'Publish product'}
            </button>
          ) : null}
        </div>
      </AdminPanel>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="size-4 shrink-0 text-red-500" />
      )}
      <span
        className={ok ? 'text-neutral-700 dark:text-neutral-300' : 'text-red-700 dark:text-red-400'}
      >
        {label}
      </span>
    </li>
  );
}
