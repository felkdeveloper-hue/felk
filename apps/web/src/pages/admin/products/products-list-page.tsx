import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminStatCard,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { BulkProductUploadDialog } from '@/components/admin/bulk-product-upload-dialog';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { useAdminPermissions } from '@/hooks/admin';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { normalizeProductStatusFilter } from '@/lib/product-status';
import {
  inventoryApi,
  productsApi,
  productImportApi,
  type AdminProduct,
} from '@/services/sdk/admin';
import type { PaginatedResult } from '@/types';

type ProductListCache = PaginatedResult<AdminProduct>;
type ProductListSnapshot = Array<[readonly unknown[], ProductListCache | undefined]>;

const PRODUCT_LIST_KEY = ['admin', 'products', 'list'] as const;

async function cancelProductListQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: PRODUCT_LIST_KEY });
}

function snapshotProductLists(queryClient: QueryClient): ProductListSnapshot {
  return queryClient.getQueriesData<ProductListCache>({ queryKey: PRODUCT_LIST_KEY });
}

function restoreProductLists(queryClient: QueryClient, snapshot: ProductListSnapshot) {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

function removeIdsFromProductLists(queryClient: QueryClient, ids: string[]) {
  const idSet = new Set(ids);
  queryClient.setQueriesData<ProductListCache>({ queryKey: PRODUCT_LIST_KEY }, (old) => {
    if (!old) return old;
    const data = old.data.filter((row) => !idSet.has(row.id));
    if (data.length === old.data.length) return old;
    const removed = old.data.length - data.length;
    const total = Math.max(0, old.meta.total - removed);
    return {
      ...old,
      data,
      meta: {
        ...old.meta,
        total,
        totalPages: Math.max(1, Math.ceil(total / (old.meta.limit || 1))),
      },
    };
  });
}

function archiveIdsInProductLists(queryClient: QueryClient, ids: string[]) {
  const idSet = new Set(ids);
  const entries = queryClient.getQueriesData<ProductListCache>({ queryKey: PRODUCT_LIST_KEY });
  for (const [queryKey, old] of entries) {
    if (!old) continue;
    const params = queryKey[3] as { status?: string } | undefined;
    const statusFilter = typeof params?.status === 'string' ? params.status : '';
    const hideArchived = Boolean(statusFilter && statusFilter !== 'archived');

    if (hideArchived) {
      const data = old.data.filter((row) => !idSet.has(row.id));
      if (data.length === old.data.length) continue;
      const removed = old.data.length - data.length;
      const total = Math.max(0, old.meta.total - removed);
      queryClient.setQueryData<ProductListCache>(queryKey, {
        ...old,
        data,
        meta: {
          ...old.meta,
          total,
          totalPages: Math.max(1, Math.ceil(total / (old.meta.limit || 1))),
        },
      });
      continue;
    }

    let changed = false;
    const data = old.data.map((row) => {
      if (!idSet.has(row.id) || row.status === 'archived') return row;
      changed = true;
      return { ...row, status: 'archived' };
    });
    if (changed) {
      queryClient.setQueryData<ProductListCache>(queryKey, { ...old, data });
    }
  }
}

function invalidateProductCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  void queryClient.invalidateQueries({ queryKey: ['products'] });
}

function productEditTo(productId: string) {
  return {
    to: ADMIN_ROUTES.productDetail,
    params: { productId },
  } as const;
}

function productSectionHref(productId: string, section: string) {
  return `${ADMIN_ROUTES.products}/${productId}?section=${encodeURIComponent(section)}`;
}

const actionBtn = 'admin-btn';
const actionPrimary = 'admin-btn-primary';
const actionSecondary = 'admin-btn-secondary';
const actionDanger = 'admin-btn-danger';

export function ProductsListPage() {
  const queryClient = useQueryClient();
  const { products, inventory } = useAdminPermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      q: search || undefined,
      status: normalizeProductStatusFilter(status),
    }),
    [page, search, status],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.adminProducts.list(params),
    queryFn: () => productsApi.list(params),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });

  const summaryQueries = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.adminProducts.list({ page: 1, limit: 1, summary: 'total' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1 }),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
      },
      {
        queryKey: QUERY_KEYS.adminProducts.list({ page: 1, limit: 1, status: 'active' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1, status: 'active' }),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
      },
      {
        queryKey: QUERY_KEYS.adminProducts.list({ page: 1, limit: 1, status: 'draft' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1, status: 'draft' }),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
      },
      {
        queryKey: QUERY_KEYS.adminInventory.items({ page: 1, limit: 1, lowStockOnly: true }),
        queryFn: () => inventoryApi.listItems({ page: 1, limit: 1, lowStockOnly: true }),
        staleTime: 60_000,
        placeholderData: (prev) => prev,
      },
    ],
  });

  const totalProducts = summaryQueries[0]?.data?.meta.total ?? 0;
  const activeProducts = summaryQueries[1]?.data?.meta.total ?? 0;
  const draftProducts = summaryQueries[2]?.data?.meta.total ?? 0;
  const lowStock = summaryQueries[3]?.data?.meta.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkDelete(ids),
    onMutate: async (ids) => {
      await cancelProductListQueries(queryClient);
      const previous = snapshotProductLists(queryClient);
      removeIdsFromProductLists(queryClient, ids);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) restoreProductLists(queryClient, context.previous);
    },
    onSettled: () => {
      invalidateProductCaches(queryClient);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkStatus(ids, 'archived'),
    onMutate: async (ids) => {
      await cancelProductListQueries(queryClient);
      const previous = snapshotProductLists(queryClient);
      archiveIdsInProductLists(queryClient, ids);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) restoreProductLists(queryClient, context.previous);
    },
    onSettled: () => {
      invalidateProductCaches(queryClient);
    },
  });

  const removeOneMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onMutate: async (id) => {
      await cancelProductListQueries(queryClient);
      const previous = snapshotProductLists(queryClient);
      removeIdsFromProductLists(queryClient, [id]);
      setSelectedIds((current) => current.filter((value) => value !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) restoreProductLists(queryClient, context.previous);
    },
    onSettled: () => {
      invalidateProductCaches(queryClient);
    },
  });

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    const rows = query.data?.data ?? [];
    setSelectedIds((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  };

  const statusTone = (value: string) => {
    const normalized = value.toLowerCase();
    if (normalized === 'published' || normalized === 'active') {
      return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
    }
    if (normalized === 'draft') {
      return 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
    }
    if (normalized === 'archived') {
      return 'bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300';
    }
    return 'bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-300';
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title="Products"
        description="Manage catalog products, variants, media, and SEO."
        actions={
          <>
            {products.export ? (
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-lg"
                disabled={exporting}
                onClick={() => {
                  setExporting(true);
                  productImportApi
                    .exportProducts(status ? { status } : undefined)
                    .catch(() => {})
                    .finally(() => setExporting(false));
                }}
              >
                {exporting ? 'Exporting…' : 'Export products'}
              </button>
            ) : null}
            {products.import || products.create ? (
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-lg"
                onClick={() => setBulkUploadOpen(true)}
              >
                Bulk upload products
              </button>
            ) : null}
            {products.create ? (
              <Link
                to={ADMIN_ROUTES.productNew}
                className="admin-btn admin-btn-primary admin-btn-lg"
              >
                Add product
              </Link>
            ) : null}
          </>
        }
      />

      <BulkProductUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onImported={() => {
          void queryClient.invalidateQueries({ queryKey: ['products'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
        }}
      />

      <div className="mb-4 grid gap-3 sm:mb-5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <AdminStatCard title="Total products" value={totalProducts} hint="All catalog items" />
        <AdminStatCard title="Active" value={activeProducts} hint="Active + published" />
        <AdminStatCard title="Draft" value={draftProducts} hint="Not ready to sell" />
        <AdminStatCard title="Low stock" value={lowStock} hint="SKUs at or below threshold" />
      </div>

      {query.isError ? (
        <AdminErrorState
          message={
            query.error instanceof Error && query.error.message
              ? `Unable to load products. ${query.error.message}`
              : 'Unable to load products.'
          }
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <ListToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search products, SKU…"
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            statusOptions={[
              { label: 'Active', value: 'active' },
              { label: 'Draft', value: 'draft' },
              { label: 'Archived', value: 'archived' },
            ]}
            page={page}
            totalPages={query.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
            bulkActions={
              selectedIds.length > 0 ? (
                <>
                  {products.delete ? (
                    <button
                      type="button"
                      className={cn(actionBtn, 'bg-red-600 text-white hover:bg-red-700')}
                      onClick={() => {
                        if (window.confirm(`Delete ${selectedIds.length} product(s)?`)) {
                          deleteMutation.mutate(selectedIds);
                        }
                      }}
                    >
                      Delete selected
                    </button>
                  ) : null}
                  {products.update ? (
                    <button
                      type="button"
                      className={cn(actionBtn, actionSecondary)}
                      onClick={() => archiveMutation.mutate(selectedIds)}
                    >
                      Archive
                    </button>
                  ) : null}
                </>
              ) : null
            }
          />

          <DataTable
            data={query.data?.data ?? []}
            isLoading={query.isLoading}
            selectedIds={selectedIds}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            getRowId={(row) => row.id}
            columns={[
              {
                id: 'name',
                header: 'Product',
                cell: (row) => (
                  <Link
                    {...productEditTo(row.id)}
                    className="font-medium text-[var(--admin-ink)] hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
              },
              { id: 'sku', header: 'SKU', cell: (row) => row.sku ?? '—' },
              {
                id: 'status',
                header: 'Status',
                cell: (row) => (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      statusTone(row.status),
                    )}
                  >
                    {row.status}
                  </span>
                ),
              },
              {
                id: 'price',
                header: 'Price',
                cell: (row) => formatCurrency(row.price ?? 0, row.currency),
              },
              { id: 'variants', header: 'Variants', cell: (row) => row.variantCount ?? 0 },
              {
                id: 'updated',
                header: 'Updated',
                cell: (row) => (row.updatedAt ? formatDate(row.updatedAt) : '—'),
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: (row) => (
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {products.update || products.view ? (
                      <Link {...productEditTo(row.id)} className={cn(actionBtn, actionPrimary)}>
                        Edit
                      </Link>
                    ) : null}
                    <a
                      href={productSectionHref(row.id, 'images')}
                      className={cn(actionBtn, actionSecondary)}
                    >
                      Images
                    </a>
                    <a
                      href={productSectionHref(row.id, 'variants')}
                      className={cn(actionBtn, actionSecondary)}
                    >
                      Variants
                    </a>
                    <a
                      href={productSectionHref(row.id, 'prices')}
                      className={cn(actionBtn, actionSecondary)}
                    >
                      Prices
                    </a>
                    {(inventory.view || inventory.adjust) && (
                      <a
                        href={productSectionHref(row.id, 'stock')}
                        className={cn(actionBtn, actionSecondary)}
                      >
                        Stock
                      </a>
                    )}
                    {products.delete ? (
                      <button
                        type="button"
                        className={cn(actionBtn, actionDanger)}
                        disabled={removeOneMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete “${row.name}”?`)) {
                            removeOneMutation.mutate(row.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </PageMotion>
  );
}
