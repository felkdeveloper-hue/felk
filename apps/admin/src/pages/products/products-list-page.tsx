import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { usePermissions } from '@/hooks';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { inventoryApi, productsApi } from '@/services';

function productHref(productId: string, section?: string) {
  const base = ADMIN_ROUTES.productDetail.replace('$productId', productId);
  return section ? `${base}?section=${section}` : base;
}

const actionBtn = 'admin-btn';
const actionPrimary = 'admin-btn-primary';
const actionSecondary = 'admin-btn-secondary';
const actionDanger = 'admin-btn-danger';

export function ProductsListPage() {
  const queryClient = useQueryClient();
  const { products, inventory } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const params = useMemo(
    () => ({ page, limit: 20, q: search || undefined, status: status || undefined }),
    [page, search, status],
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.products.list(params),
    queryFn: () => productsApi.list(params),
  });

  const summaryQueries = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.products.list({ page: 1, limit: 1, summary: 'total' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1 }),
      },
      {
        queryKey: QUERY_KEYS.products.list({ page: 1, limit: 1, status: 'active' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1, status: 'active' }),
      },
      {
        queryKey: QUERY_KEYS.products.list({ page: 1, limit: 1, status: 'published' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1, status: 'published' }),
      },
      {
        queryKey: QUERY_KEYS.products.list({ page: 1, limit: 1, status: 'draft' }),
        queryFn: () => productsApi.list({ page: 1, limit: 1, status: 'draft' }),
      },
      {
        queryKey: QUERY_KEYS.inventory.items({ page: 1, limit: 1, lowStockOnly: true }),
        queryFn: () => inventoryApi.listItems({ page: 1, limit: 1, lowStockOnly: true }),
      },
    ],
  });

  const totalProducts = summaryQueries[0]?.data?.meta.total ?? 0;
  const activeProducts =
    (summaryQueries[1]?.data?.meta.total ?? 0) + (summaryQueries[2]?.data?.meta.total ?? 0);
  const draftProducts = summaryQueries[3]?.data?.meta.total ?? 0;
  const lowStock = summaryQueries[4]?.data?.meta.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkDelete(ids),
    onSuccess: () => {
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkStatus(ids, 'archived'),
    onSuccess: () => {
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const removeOneMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
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
          products.create ? (
            <Link to={ADMIN_ROUTES.productNew} className="admin-btn admin-btn-primary admin-btn-lg">
              Add product
            </Link>
          ) : null
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="Total products" value={totalProducts} hint="All catalog items" />
        <AdminStatCard title="Active" value={activeProducts} hint="Active + published" />
        <AdminStatCard title="Draft" value={draftProducts} hint="Not ready to sell" />
        <AdminStatCard title="Low stock" value={lowStock} hint="SKUs at or below threshold" />
      </div>

      {query.isError ? (
        <AdminErrorState message="Unable to load products." onRetry={() => query.refetch()} />
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
              { label: 'Published', value: 'published' },
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
                    to={productHref(row.id)}
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
                      <a href={productHref(row.id)} className={cn(actionBtn, actionPrimary)}>
                        Edit
                      </a>
                    ) : null}
                    <a
                      href={productHref(row.id, 'images')}
                      className={cn(actionBtn, actionSecondary)}
                    >
                      Images
                    </a>
                    <a
                      href={productHref(row.id, 'variants')}
                      className={cn(actionBtn, actionSecondary)}
                    >
                      Variants
                    </a>
                    <a
                      href={productHref(row.id, 'prices')}
                      className={cn(actionBtn, actionSecondary)}
                    >
                      Prices
                    </a>
                    {(inventory.view || inventory.adjust) && (
                      <a
                        href={productHref(row.id, 'stock')}
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
