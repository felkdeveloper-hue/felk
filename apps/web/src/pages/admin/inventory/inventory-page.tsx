import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AdminErrorState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  DataTable,
  ListToolbar,
  PageMotion,
} from '@/components/admin';
import { QUERY_KEYS } from '@/constants';
import { inventoryApi } from '@/services/sdk/admin';

export function InventoryPage() {
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState('');

  const warehousesQuery = useQuery({
    queryKey: QUERY_KEYS.adminInventory.warehouses(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const alertsQuery = useQuery({
    queryKey: QUERY_KEYS.adminInventory.alerts(),
    queryFn: () => inventoryApi.listAlerts(),
  });

  const params = useMemo(
    () => ({ page, limit: 20, warehouseId: warehouseId || undefined }),
    [page, warehouseId],
  );

  const itemsQuery = useQuery({
    queryKey: QUERY_KEYS.adminInventory.items(params),
    queryFn: () => inventoryApi.listItems(params),
  });

  if (itemsQuery.isError) {
    return (
      <AdminErrorState message="Unable to load inventory." onRetry={() => itemsQuery.refetch()} />
    );
  }

  const lowStock = (itemsQuery.data?.data ?? []).filter(
    (item) => item.quantityAvailable <= 5,
  ).length;

  return (
    <PageMotion>
      <AdminPageHeader
        title="Inventory"
        description="Monitor stock levels, reservations, movements, and warehouse alerts."
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <AdminStatCard title="SKUs tracked" value={itemsQuery.data?.meta.total ?? 0} />
        <AdminStatCard title="Low stock" value={lowStock} />
        <AdminStatCard
          title="Alerts"
          value={Array.isArray(alertsQuery.data) ? alertsQuery.data.length : 0}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={warehouseId}
          onChange={(event) => {
            setWarehouseId(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All warehouses</option>
          {(warehousesQuery.data ?? []).map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      <ListToolbar
        page={page}
        totalPages={itemsQuery.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
      />

      <DataTable
        data={itemsQuery.data?.data ?? []}
        isLoading={itemsQuery.isLoading}
        getRowId={(row) => row.id}
        columns={[
          { id: 'sku', header: 'SKU', cell: (row) => row.sku ?? row.productId },
          { id: 'warehouse', header: 'Warehouse', cell: (row) => row.warehouseId },
          { id: 'onHand', header: 'On hand', cell: (row) => row.quantityOnHand },
          { id: 'reserved', header: 'Reserved', cell: (row) => row.quantityReserved },
          { id: 'available', header: 'Available', cell: (row) => row.quantityAvailable },
        ]}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <AdminPanel title="Adjustments & transfers">
          <p className="text-sm text-neutral-600">
            Stock adjustment and transfer workflows connect to inventory APIs.
          </p>
        </AdminPanel>
        <AdminPanel title="Alerts">
          <ul className="space-y-2 text-sm text-neutral-600">
            {(alertsQuery.data ?? []).slice(0, 8).map((alert, index) => (
              <li key={index}>{JSON.stringify(alert)}</li>
            ))}
            {(alertsQuery.data?.length ?? 0) === 0 ? <li>No active alerts.</li> : null}
          </ul>
        </AdminPanel>
      </div>
    </PageMotion>
  );
}
