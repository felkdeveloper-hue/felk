import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { AdminEmptyState, AdminPanel } from '@/components/admin';
import { QUERY_KEYS } from '@/constants';
import { formatCurrency } from '@/lib/utils';
import { AppError } from '@/lib/errors';
import { inventoryApi, productsApi, type AdminVariant } from '@/services';

const fieldClass =
  'w-full rounded-lg border border-[var(--admin-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-accent)]/50';

const btnPrimary =
  'inline-flex h-9 items-center justify-center rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60';
const btnGhost =
  'inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-[var(--admin-ink)] disabled:opacity-60';
const btnDanger =
  'inline-flex h-8 items-center justify-center rounded-md px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60';

export type ProductSection = 'details' | 'variants' | 'prices' | 'stock';

export function ProductCommercePanels({
  productId,
  section = 'details',
  canUpdate,
  canCreate,
  canDelete,
  canAdjustStock,
}: {
  productId: string;
  section?: ProductSection;
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canAdjustStock: boolean;
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

  const [sku, setSku] = useState('');
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
  }, [section, variantsQuery.isFetched, stockQuery.isFetched]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.inventory.items({ productId, limit: 100 }),
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      productsApi.createVariant(productId, {
        sku: sku.trim(),
        title: title.trim() || undefined,
        price: Number(price) || 0,
        salePrice: salePrice === '' ? null : Number(salePrice),
        currency: 'LKR',
      }),
    onSuccess: async () => {
      setSku('');
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

  const highlight = (name: ProductSection) =>
    section === name ? 'ring-2 ring-[var(--admin-accent)]/35' : '';

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <AdminPanel title="Variants">
        <div id="product-section-variants" className={highlight('variants')}>
          {canCreate ? (
            <form
              className="mb-5 grid gap-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 md:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <input
                className={fieldClass}
                placeholder="SKU"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                required
              />
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
            </form>
          ) : null}

          {variantsQuery.isLoading ? (
            <p className="text-sm text-neutral-500">Loading variants…</p>
          ) : variants.length === 0 ? (
            <AdminEmptyState
              title="No variants yet"
              description="Add a SKU and price to create the first sellable variant."
            />
          ) : (
            <ul className="divide-y divide-[var(--admin-line)]">
              {variants.map((variant) => (
                <li
                  key={variant.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-[var(--admin-ink)]">
                      {variant.title || variant.sku}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {variant.sku}
                      {variant.isDefault ? ' · default' : ''} · stock{' '}
                      {stockByVariant.get(variant.id) ?? 0}
                    </p>
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
              ))}
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
                    <p className="text-xs text-neutral-500">{variant.sku}</p>
                  </div>
                  <label className="block text-xs text-neutral-500">
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
                  <label className="block text-xs text-neutral-500">
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
                      <p className="text-xs text-neutral-500">
                        Available: {stockByVariant.get(variant.id) ?? 0}
                      </p>
                    </div>
                    <label className="block text-xs text-neutral-500">
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
                    <label className="block text-xs text-neutral-500">
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
                    <label className="block text-xs text-neutral-500">
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
                      <span className={`${btnGhost} self-end`}>View only</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
