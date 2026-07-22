import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminEmptyState, AdminPanel } from '@/components/admin';
import { ImageUploader } from '@/components/admin/image-uploader';
import { QUERY_KEYS } from '@/constants';
import { formatCurrency } from '@/lib/utils';
import { AppError } from '@/lib/errors';
import { nextLinkedSku } from '@/lib/sku';
import {
  inventoryApi,
  mediaApi,
  productsApi,
  cmsApi,
  type AdminVariant,
} from '@/services/sdk/admin';

const fieldClass =
  'w-full rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)] outline-none focus:border-[var(--admin-accent)]/50';

const btnPrimary =
  'inline-flex h-9 items-center justify-center rounded-none bg-[var(--admin-ink)] px-3 text-sm font-medium text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60';
const btnDanger =
  'inline-flex h-8 items-center justify-center rounded-none px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10';

export type ProductSection = 'details' | 'images' | 'variants' | 'prices' | 'stock' | 'review';

export function ProductCommercePanels({
  productId,
  productSku,
  productName,
  productPrice = 0,
  productSalePrice = null,
  productCurrency = 'LKR',
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
  productPrice?: number;
  productSalePrice?: number | null;
  productCurrency?: string;
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
  const stockQuery = useQuery({
    queryKey: QUERY_KEYS.inventory.items({ productId, limit: 100 }),
    queryFn: () => inventoryApi.listItems({ productId, limit: 100 }),
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

  const [title, setTitle] = useState('');
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
  const [price, setPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [photoColorId, setPhotoColorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [productPriceDraft, setProductPriceDraft] = useState({
    price: String(productPrice ?? 0),
    salePrice: productSalePrice == null ? '' : String(productSalePrice),
  });
  const [productPriceDirty, setProductPriceDirty] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<
    Record<string, { price: string; salePrice: string }>
  >({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  const variants = variantsQuery.data ?? [];
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
    if (productPriceDirty) return;
    setProductPriceDraft({
      price: String(productPrice ?? 0),
      salePrice: productSalePrice == null ? '' : String(productSalePrice),
    });
  }, [productPrice, productSalePrice, productPriceDirty]);

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

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stockRows) {
      if (!row.variantId) continue;
      map.set(row.variantId, (map.get(row.variantId) ?? 0) + row.quantityOnHand);
    }
    return map;
  }, [stockRows]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const variant of variants) {
      next[variant.id] = String(stockByVariant.get(variant.id) ?? 0);
    }
    setStockDrafts(next);
  }, [variants, stockByVariant]);

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) }),
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

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const createMutation = useMutation({
    mutationFn: async () => {
      const colorOptions = selectedColorIds.length ? selectedColorIds : [''];
      const sizeOptions = selectedSizeIds.length ? selectedSizeIds : [''];
      const pairs: { colorId: string; sizeId: string }[] = [];
      for (const colorId of colorOptions) {
        for (const sizeId of sizeOptions) {
          pairs.push({ colorId, sizeId });
        }
      }

      const existingKeys = new Set(
        variants.map((variant) => `${variant.colorId ?? ''}:${variant.sizeId ?? ''}`),
      );

      const toCreate = pairs.filter((pair) => !existingKeys.has(`${pair.colorId}:${pair.sizeId}`));
      if (!toCreate.length) {
        throw new AppError(
          selectedColorIds.length || selectedSizeIds.length
            ? 'Those size x color combinations already exist.'
            : 'Select at least one size or color, or add a single unlabeled variant.',
        );
      }

      const basePrice = Number(price) || 0;
      const baseSale = salePrice === '' ? null : Number(salePrice);

      for (const pair of toCreate) {
        const colorName = colorsQuery.data?.data.find((c) => c.id === pair.colorId)?.name;
        const sizeName = sizesQuery.data?.data.find((s) => s.id === pair.sizeId)?.name;
        const autoTitle =
          title.trim() || [colorName, sizeName].filter(Boolean).join(' / ') || undefined;
        await productsApi.createVariant(productId, {
          title: autoTitle,
          colorId: pair.colorId || null,
          sizeId: pair.sizeId || null,
          price: basePrice,
          salePrice: baseSale,
          currency: 'LKR',
        });
      }

      return toCreate.length;
    },
    onSuccess: async () => {
      setTitle('');
      setSelectedColorIds([]);
      setSelectedSizeIds([]);
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

  const updateProductPriceMutation = useMutation({
    mutationFn: () =>
      productsApi.update(productId, {
        pricing: {
          price: Number(productPriceDraft.price) || 0,
          salePrice:
            productPriceDraft.salePrice === '' ? null : Number(productPriceDraft.salePrice),
          currency: productCurrency,
        },
      }),
    onSuccess: async () => {
      setError(null);
      setProductPriceDirty(false);
      await invalidate();
    },
    onError: (err) => {
      setError(err instanceof AppError ? err.message : 'Unable to update product price.');
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

  const setStockMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const quantity = Number(stockDrafts[variantId] ?? 0);
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new AppError('Enter a whole number of 0 or more.');
      }
      await inventoryApi.setStock({ variantId, quantity });
    },
    onSuccess: async () => {
      setError(null);
      await invalidate();
      await stockQuery.refetch();
    },
    onError: (err) => {
      setError(err instanceof AppError ? err.message : 'Unable to save stock.');
    },
  });

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
  const draftPrice = Number(productPriceDraft.price);
  const hasProductPrice =
    (Number.isFinite(draftPrice) && draftPrice > 0) ||
    (typeof productPrice === 'number' && productPrice > 0) ||
    variants.some((variant) => (variant.price ?? 0) > 0);
  const readyToPublish = hasMainImage && hasProductPrice;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <AdminPanel title="Product images">
        <div id="product-section-images" className={highlight('images')}>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            Upload photos here for the product gallery. The â˜… Main badge marks the listing photo
            shoppers see first. At least one image is required.
          </p>
          <ImageUploader
            images={mainImages}
            required
            disabled={!canUpdate}
            uploading={uploadMainMutation.isPending}
            onUpload={(file) => uploadMainMutation.mutate(file)}
            onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
            onRemove={(id) => removeMediaMutation.mutate(id)}
            hint="Hover an image and click the star to change the main listing photo."
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Variants">
        <div id="product-section-variants" className={highlight('variants')}>
          {canCreate ? (
            <form
              className="mb-6 space-y-5 border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <div>
                <p className="text-sm font-semibold text-[var(--admin-ink)]">
                  Create size x color SKUs
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Next SKU:{' '}
                  <span className="font-mono font-medium text-[var(--admin-ink)]">
                    {previewSku ?? 'Assigned on save'}
                  </span>
                  {canPreviewSku && productSku ? (
                    <span className="text-neutral-400"> · parent {productSku}</span>
                  ) : null}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                    1. Colors
                  </p>
                  <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto border border-[var(--admin-line)] p-2">
                    {(colorsQuery.data?.data ?? []).length === 0 ? (
                      <p className="text-xs text-neutral-500">
                        Add colors under Catalog â†’ Colors.
                      </p>
                    ) : (
                      (colorsQuery.data?.data ?? []).map((color) => {
                        const checked = selectedColorIds.includes(color.id);
                        return (
                          <label
                            key={color.id}
                            className={`inline-flex cursor-pointer items-center border px-2.5 py-1.5 text-xs font-medium transition ${
                              checked
                                ? 'border-[var(--admin-ink)] bg-[var(--admin-ink)] text-[var(--admin-surface)]'
                                : 'hover:border-[var(--admin-ink)]/50 border-[var(--admin-line)] text-[var(--admin-ink)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() =>
                                setSelectedColorIds((current) => toggleId(current, color.id))
                              }
                            />
                            {color.name}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                    2. Sizes
                  </p>
                  <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto border border-[var(--admin-line)] p-2">
                    {(sizesQuery.data?.data ?? []).length === 0 ? (
                      <p className="text-xs text-neutral-500">Add sizes under Catalog â†’ Sizes.</p>
                    ) : (
                      (sizesQuery.data?.data ?? []).map((size) => {
                        const checked = selectedSizeIds.includes(size.id);
                        return (
                          <label
                            key={size.id}
                            className={`inline-flex cursor-pointer items-center border px-2.5 py-1.5 text-xs font-medium transition ${
                              checked
                                ? 'border-[var(--admin-ink)] bg-[var(--admin-ink)] text-[var(--admin-surface)]'
                                : 'hover:border-[var(--admin-ink)]/50 border-[var(--admin-line)] text-[var(--admin-ink)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() =>
                                setSelectedSizeIds((current) => toggleId(current, size.id))
                              }
                            />
                            {size.name}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  3. Price and create
                </p>
                <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                  <input
                    className={fieldClass}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price for all selected combinations"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    required
                  />
                  <input
                    className={fieldClass}
                    placeholder="Label (optional)"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <button type="submit" className={btnPrimary} disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? 'Adding...'
                      : (() => {
                          const total =
                            selectedColorIds.length || selectedSizeIds.length
                              ? Math.max(selectedColorIds.length, 1) *
                                Math.max(selectedSizeIds.length, 1)
                              : 1;
                          return total > 1 ? `Create ${total} SKUs` : 'Create SKU';
                        })()}
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  Example: Black + Red, and S / M / L â†’ creates 6 SKUs. Set stock and sale prices
                  in the Stock / Prices tabs.
                </p>
              </div>
            </form>
          ) : null}

          {variantsQuery.isLoading ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading variants...</p>
          ) : variants.length === 0 ? (
            <AdminEmptyState
              title="No size / color SKUs yet"
              description="Pick colors and sizes above, enter a price, then create."
            />
          ) : (
            <div className="space-y-6">
              {(() => {
                const colorNameById = new Map(
                  (colorsQuery.data?.data ?? []).map((c) => [c.id, c.name] as const),
                );
                const sizeNameById = new Map(
                  (sizesQuery.data?.data ?? []).map((s) => [s.id, s.name] as const),
                );
                const hasColored = variants.some((v) => v.colorId);
                const displayVariants = hasColored
                  ? variants.filter((v) => v.colorId || v.sizeId)
                  : variants;
                // Prefer real color/size rows; hide orphan default when colored SKUs exist
                const rows = hasColored
                  ? displayVariants.filter((v) => v.colorId || (v.sizeId && !v.isDefault))
                  : displayVariants;

                const colorOptions = [
                  ...new Map(
                    variants
                      .filter((v) => v.colorId)
                      .map(
                        (v) =>
                          [
                            v.colorId!,
                            colorNameById.get(v.colorId!) ??
                              v.optionValues?.color ??
                              v.title?.split(' / ')[0] ??
                              'Color',
                          ] as const,
                      ),
                  ).entries(),
                ];

                const activePhotoColor = photoColorId || colorOptions[0]?.[0] || '';
                const photoTarget =
                  variants.find((v) => v.colorId === activePhotoColor) ??
                  variants.find((v) => v.colorId);
                const photoImages = photoTarget ? (variantMediaMap.get(photoTarget.id) ?? []) : [];

                return (
                  <>
                    <div className="overflow-x-auto border border-[var(--admin-line)]">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <thead className="bg-[var(--admin-panel-soft)] text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">
                          <tr>
                            <th className="px-3 py-2.5">Color</th>
                            <th className="px-3 py-2.5">Size</th>
                            <th className="px-3 py-2.5">SKU</th>
                            <th className="px-3 py-2.5">Stock</th>
                            <th className="px-3 py-2.5">Price</th>
                            <th className="px-3 py-2.5 text-right"> </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--admin-line)]">
                          {rows.map((variant) => {
                            const colorLabel = variant.colorId
                              ? (colorNameById.get(variant.colorId) ??
                                variant.optionValues?.color ??
                                '-')
                              : '-';
                            const sizeLabel = variant.sizeId
                              ? (sizeNameById.get(variant.sizeId) ??
                                variant.optionValues?.size ??
                                '-')
                              : '-';
                            return (
                              <tr key={variant.id} className="bg-[var(--admin-surface)]">
                                <td className="px-3 py-2.5 font-medium text-[var(--admin-ink)]">
                                  {colorLabel}
                                </td>
                                <td className="px-3 py-2.5 text-[var(--admin-ink)]">{sizeLabel}</td>
                                <td className="px-3 py-2.5 font-mono text-xs text-neutral-500">
                                  {variant.sku}
                                </td>
                                <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400">
                                  {stockByVariant.get(variant.id) ?? 0}
                                </td>
                                <td className="px-3 py-2.5 font-medium">
                                  {formatCurrency(variant.price, variant.currency)}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      className={btnDanger}
                                      disabled={deleteMutation.isPending}
                                      onClick={() => {
                                        if (window.confirm(`Delete ${variant.sku}?`)) {
                                          deleteMutation.mutate(variant.id);
                                        }
                                      }}
                                    >
                                      Remove
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {colorOptions.length > 0 && photoTarget ? (
                      <div className="border border-[var(--admin-line)] p-4">
                        <p className="text-sm font-semibold text-[var(--admin-ink)]">
                          Color photos (optional)
                        </p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          Upload photos for one color at a time. These swap in the storefront
                          gallery when the shopper picks that color. Main gallery photos stay in
                          Product images above.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {colorOptions.map(([id, name]) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setPhotoColorId(id)}
                              className={`border px-2.5 py-1.5 text-xs font-medium transition ${
                                activePhotoColor === id
                                  ? 'border-[var(--admin-ink)] bg-[var(--admin-ink)] text-[var(--admin-surface)]'
                                  : 'hover:border-[var(--admin-ink)]/50 border-[var(--admin-line)] text-[var(--admin-ink)]'
                              }`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3">
                          <ImageUploader
                            images={photoImages}
                            compact
                            disabled={!canUpdate}
                            uploading={
                              uploadVariantImageMutation.isPending &&
                              uploadVariantImageMutation.variables?.variantId === photoTarget.id
                            }
                            onUpload={(file) =>
                              uploadVariantImageMutation.mutate({
                                variantId: photoTarget.id,
                                file,
                              })
                            }
                            onRemove={(id) => removeMediaMutation.mutate(id)}
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Prices">
        <div id="product-section-prices" className={highlight('prices')}>
          {variants.length === 0 ? (
            <div className="grid gap-3 rounded-none border border-[var(--admin-line)] p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <p className="text-sm font-medium">Main product</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {productSku ?? 'No variants - price applies to the product itself'}
                </p>
              </div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                Price
                <input
                  className={`${fieldClass} mt-1`}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!canUpdate}
                  value={productPriceDraft.price}
                  onChange={(event) => {
                    setProductPriceDirty(true);
                    setProductPriceDraft((current) => ({
                      ...current,
                      price: event.target.value,
                    }));
                  }}
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
                  value={productPriceDraft.salePrice}
                  onChange={(event) => {
                    setProductPriceDirty(true);
                    setProductPriceDraft((current) => ({
                      ...current,
                      salePrice: event.target.value,
                    }));
                  }}
                />
              </label>
              {canUpdate ? (
                <button
                  type="button"
                  className={`${btnPrimary} self-end`}
                  disabled={updateProductPriceMutation.isPending}
                  onClick={() => updateProductPriceMutation.mutate()}
                >
                  Save
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="grid gap-3 rounded-none border border-[var(--admin-line)] p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]"
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
              title="No variants yet"
              description="Add a variant to track how many pieces you have in stock."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Enter how many pieces you have available, then save.
              </p>
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="grid gap-3 rounded-none border border-[var(--admin-line)] p-4 md:grid-cols-[1.2fr_1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-medium">{variant.title || variant.sku}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{variant.sku}</p>
                  </div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                    Stock (pcs)
                    <input
                      className={`${fieldClass} mt-1`}
                      type="number"
                      min="0"
                      step="1"
                      disabled={!canAdjustStock}
                      value={stockDrafts[variant.id] ?? String(stockByVariant.get(variant.id) ?? 0)}
                      onChange={(event) =>
                        setStockDrafts((current) => ({
                          ...current,
                          [variant.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  {canAdjustStock ? (
                    <button
                      type="button"
                      className={`${btnPrimary} self-end`}
                      disabled={setStockMutation.isPending}
                      onClick={() => setStockMutation.mutate(variant.id)}
                    >
                      Save
                    </button>
                  ) : (
                    <span className="self-end text-xs text-neutral-500 dark:text-neutral-400">
                      View only
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminPanel>

      <AdminPanel title="Review & publish">
        <div id="product-section-review" className={highlight('review')}>
          {isPublished ? (
            <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-300">
              <strong>{productName}</strong> is already live on the storefront (status: active). You
              do not need to publish again.
            </p>
          ) : (
            <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
              Everything below must be complete before <strong>{productName}</strong> can go live.
            </p>
          )}
          <ul className="space-y-2 text-sm">
            <ChecklistItem ok={hasMainImage || isPublished} label="At least one product image" />
            <ChecklistItem
              ok={hasProductPrice || isPublished}
              label="Product or variant price set"
            />
          </ul>

          {canPublish ? (
            <button
              type="button"
              className={`${btnPrimary} mt-5`}
              disabled={isPublishing || isPublished || !readyToPublish}
              onClick={onPublish}
              title={
                isPublished
                  ? 'Product is already live'
                  : !readyToPublish
                    ? 'Complete the checklist above to publish'
                    : undefined
              }
            >
              {isPublished ? 'Already live' : isPublishing ? 'Publishing...' : 'Publish product'}
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
