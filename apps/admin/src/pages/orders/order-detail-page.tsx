import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@fe-platform/ui';
import { AdminErrorState, AdminPageHeader, AdminPanel, PageMotion } from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { usePermissions } from '@/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ordersApi } from '@/services';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const { orders: orderPerms } = usePermissions();
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState('processing');

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.orders.detail(orderId),
    queryFn: () => ordersApi.getById(orderId),
  });

  const timelineQuery = useQuery({
    queryKey: QUERY_KEYS.orders.timeline(orderId),
    queryFn: () => ordersApi.getTimeline(orderId),
  });

  const returnsQuery = useQuery({
    queryKey: ['orders', orderId, 'returns'],
    queryFn: () => ordersApi.listReturns(orderId),
  });

  const invoiceQuery = useQuery({
    queryKey: ['orders', orderId, 'invoice'],
    queryFn: () => ordersApi.getInvoice(orderId),
    enabled: false,
  });

  const statusMutation = useMutation({
    mutationFn: () => ordersApi.updateStatus(orderId, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => ordersApi.addNote(orderId, note),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders.timeline(orderId) });
    },
  });

  if (detailQuery.isError) {
    return (
      <AdminErrorState message="Unable to load order." onRetry={() => detailQuery.refetch()} />
    );
  }

  const order = readRecord(detailQuery.data);
  const totals = readRecord(order.totals);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <PageMotion>
      <AdminPageHeader
        title={`Order ${String(order.orderNumber ?? orderId)}`}
        description={`Status: ${String(order.status ?? 'unknown')}`}
        actions={
          <Link to={ADMIN_ROUTES.orders}>
            <Button variant="outline" size="sm">
              Back to orders
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <AdminPanel title="Line items">
            <ul className="space-y-3 text-sm">
              {items.map((item, index) => {
                const row = readRecord(item);
                return (
                  <li
                    key={String(row.id ?? index)}
                    className="flex justify-between gap-4 border-b border-neutral-100 pb-3"
                  >
                    <span>{String(row.name ?? row.productName ?? 'Item')}</span>
                    <span>{String(row.quantity ?? 1)}</span>
                  </li>
                );
              })}
              {items.length === 0 ? (
                <li className="text-neutral-500">No line items returned.</li>
              ) : null}
            </ul>
          </AdminPanel>

          <AdminPanel title="Timeline">
            <ul className="space-y-2 text-sm text-neutral-600">
              {(timelineQuery.data ?? []).map((entry, index) => {
                const row = readRecord(entry);
                return (
                  <li key={String(row.id ?? index)}>
                    {String(row.message ?? row.status ?? 'Update')} ·{' '}
                    {row.createdAt ? formatDate(String(row.createdAt)) : ''}
                  </li>
                );
              })}
              {(timelineQuery.data?.length ?? 0) === 0 ? <li>No timeline events yet.</li> : null}
            </ul>
          </AdminPanel>

          <AdminPanel title="Returns">
            <ul className="space-y-2 text-sm text-neutral-600">
              {(returnsQuery.data ?? []).map((entry, index) => {
                const row = readRecord(entry);
                return (
                  <li key={String(row.id ?? index)}>{String(row.status ?? 'Return request')}</li>
                );
              })}
              {(returnsQuery.data?.length ?? 0) === 0 ? <li>No return requests.</li> : null}
            </ul>
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Grand total</dt>
                <dd>
                  {formatCurrency(Number(totals.grandTotal ?? 0), String(order.currency ?? 'LKR'))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Payment</dt>
                <dd>{String(order.paymentMethod ?? '—')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Placed</dt>
                <dd>{order.createdAt ? formatDate(String(order.createdAt)) : '—'}</dd>
              </div>
            </dl>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => invoiceQuery.refetch()}
            >
              View invoice
            </Button>
            {invoiceQuery.data ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded bg-neutral-50 p-3 text-xs">
                {JSON.stringify(invoiceQuery.data, null, 2)}
              </pre>
            ) : null}
          </AdminPanel>

          {orderPerms.update ? (
            <AdminPanel title="Update status">
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                className="mb-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button
                size="sm"
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
              >
                Update status
              </Button>
            </AdminPanel>
          ) : null}

          {orderPerms.update ? (
            <AdminPanel title="Internal note">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mb-3 min-h-24 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                placeholder="Add a note for staff"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => noteMutation.mutate()}
                disabled={!note.trim()}
              >
                Save note
              </Button>
            </AdminPanel>
          ) : null}
        </div>
      </div>
    </PageMotion>
  );
}
