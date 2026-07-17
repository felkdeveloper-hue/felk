import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Button } from '@fe-platform/ui';
import {
  AdminErrorState,
  AdminPageHeader,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { usePermissions } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { productsApi } from '@/services';

export function ProductsListPage() {
  const queryClient = useQueryClient();
  const { products } = usePermissions();
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

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkDelete(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkStatus(ids, 'archived'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => productsApi.duplicate(id),
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

  return (
    <PageMotion>
      <AdminPageHeader
        title="Products"
        description="Manage catalog products, variants, media, and SEO."
        actions={
          products.create ? (
            <Link to={ADMIN_ROUTES.productNew}>
              <Button size="sm">Create product</Button>
            </Link>
          ) : null
        }
      />

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
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            statusOptions={[
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(selectedIds)}
                    >
                      Delete
                    </Button>
                  ) : null}
                  {products.update ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate(selectedIds)}
                    >
                      Archive
                    </Button>
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
                    to={ADMIN_ROUTES.productDetail.replace('$productId', row.id)}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {row.name}
                  </Link>
                ),
              },
              { id: 'sku', header: 'SKU', cell: (row) => row.sku ?? '—' },
              { id: 'status', header: 'Status', cell: (row) => row.status },
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
                header: '',
                cell: (row) =>
                  products.create ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateMutation.mutate(row.id)}
                    >
                      Duplicate
                    </Button>
                  ) : null,
              },
            ]}
          />
        </>
      )}
    </PageMotion>
  );
}
