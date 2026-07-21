import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@fe-platform/ui';
import { AdminErrorState, AdminPageHeader, AdminPanel, PageMotion } from '@/components/admin';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import { useAdminPermissions } from '@/hooks/admin';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { formatOrderAddress, ordersApi, type AdminOrderAddress } from '@/services/sdk/admin';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readAddress(value: unknown): AdminOrderAddress | null {
  const record = readRecord(value);
  if (!record.fullName && !record.line1) return null;
  return {
    fullName: String(record.fullName ?? ''),
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    line1: String(record.line1 ?? ''),
    line2:
      typeof record.line2 === 'string' ? record.line2 : record.line2 === null ? null : undefined,
    city: String(record.city ?? ''),
    state:
      typeof record.state === 'string' ? record.state : record.state === null ? null : undefined,
    postalCode: String(record.postalCode ?? ''),
    country: String(record.country ?? ''),
  };
}

function AddressBlock({ address, title }: { address: AdminOrderAddress | null; title: string }) {
  if (!address) {
    return (
      <AdminPanel title={title}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No address on file.</p>
      </AdminPanel>
    );
  }

  return (
    <AdminPanel title={title}>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">
        <p className="font-medium text-[var(--admin-ink)]">{address.fullName}</p>
        {address.phone ? (
          <p className="mt-1">
            <a href={`tel:${address.phone}`} className="hover:underline">
              {address.phone}
            </a>
          </p>
        ) : null}
        <p className="mt-2 leading-relaxed">{formatOrderAddress(address)}</p>
      </div>
    </AdminPanel>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status === 'pending' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        status === 'confirmed' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
        status === 'shipped' && 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
        status === 'delivered' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        status === 'cancelled' && 'bg-red-500/15 text-red-700 dark:text-red-300',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const { orders: orderPerms } = useAdminPermissions();
  const [note, setNote] = useState('');
  const [nextStatus, setNextStatus] = useState('confirmed');

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.adminOrders.detail(orderId),
    queryFn: () => ordersApi.getById(orderId),
  });

  const timelineQuery = useQuery({
    queryKey: QUERY_KEYS.adminOrders.timeline(orderId),
    queryFn: () => ordersApi.getTimeline(orderId),
  });

  const returnsQuery = useQuery({
    queryKey: ['admin', 'orders', orderId, 'returns'],
    queryFn: () => ordersApi.listReturns(orderId),
  });

  const invoiceQuery = useQuery({
    queryKey: ['admin', 'orders', orderId, 'invoice'],
    queryFn: () => ordersApi.getInvoice(orderId),
    enabled: false,
  });

  const statusMutation = useMutation({
    mutationFn: () => ordersApi.updateStatus(orderId, nextStatus),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.stats() });
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => ordersApi.addNote(orderId, note),
    onSuccess: () => {
      setNote('');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOrders.timeline(orderId) });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <PageMotion>
        <AdminPageHeader title="Loading order…" description="Fetching order details." />
      </PageMotion>
    );
  }

  if (detailQuery.isError) {
    return (
      <AdminErrorState message="Unable to load order." onRetry={() => detailQuery.refetch()} />
    );
  }

  const order = readRecord(detailQuery.data);
  const totals = readRecord(order.totals);
  const shippingAddress = readAddress(order.shippingAddress);
  const billingAddress = readAddress(order.billingAddress);
  const items = Array.isArray(order.items) ? order.items : [];
  const status = String(order.status ?? 'pending');

  return (
    <PageMotion>
      <AdminPageHeader
        title={`Order ${String(order.orderNumber ?? orderId)}`}
        description={`Placed ${order.createdAt ? formatDate(String(order.createdAt)) : '—'}`}
        actions={
          <Link to={ADMIN_ROUTES.orders}>
            <Button variant="outline" size="sm">
              Back to orders
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminPanel>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Status
          </p>
          <div className="mt-2">
            <StatusBadge status={status} />
          </div>
        </AdminPanel>
        <AdminPanel>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Customer
          </p>
          <p className="mt-2 font-medium">{shippingAddress?.fullName ?? '—'}</p>
          {shippingAddress?.phone ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{shippingAddress.phone}</p>
          ) : null}
        </AdminPanel>
        <AdminPanel>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Payment
          </p>
          <p className="mt-2 font-medium capitalize">
            {String(order.paymentMethod ?? '—').replace(/_/g, ' ')}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {String(order.paymentReference ?? '—')}
          </p>
        </AdminPanel>
        <AdminPanel>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Total
          </p>
          <p className="mt-2 font-serif text-2xl tabular-nums">
            {formatCurrency(Number(totals.grandTotal ?? 0), String(order.currency ?? 'LKR'))}
          </p>
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <AdminPanel title="Line items">
            <ul className="space-y-3 text-sm">
              {items.map((item, index) => {
                const row = readRecord(item);
                return (
                  <li
                    key={String(row.id ?? index)}
                    className="flex items-start justify-between gap-4 border-b border-[var(--admin-line)] pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-[var(--admin-ink)]">
                        {String(row.name ?? row.productName ?? 'Item')}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {String(row.variantTitle ?? '')} · SKU {String(row.sku ?? '—')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>Qty {String(row.quantity ?? 1)}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(
                          Number(row.lineTotal ?? row.lineSubtotal ?? 0),
                          String(order.currency ?? 'LKR'),
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
              {items.length === 0 ? (
                <li className="text-neutral-500 dark:text-neutral-400">No line items returned.</li>
              ) : null}
            </ul>
          </AdminPanel>

          <div className="grid gap-6 md:grid-cols-2">
            <AddressBlock address={shippingAddress} title="Shipping address" />
            <AddressBlock address={billingAddress} title="Billing address" />
          </div>

          <AdminPanel title="Timeline">
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              {(timelineQuery.data ?? []).map((entry, index) => {
                const row = readRecord(entry);
                return (
                  <li key={String(row.id ?? index)}>
                    {String(row.note ?? row.event ?? row.status ?? 'Update')} ·{' '}
                    {row.createdAt ? formatDate(String(row.createdAt)) : ''}
                  </li>
                );
              })}
              {(timelineQuery.data?.length ?? 0) === 0 ? (
                <li className="text-neutral-500 dark:text-neutral-400">No timeline events yet.</li>
              ) : null}
            </ul>
          </AdminPanel>

          <AdminPanel title="Returns">
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              {(returnsQuery.data ?? []).map((entry, index) => {
                const row = readRecord(entry);
                return (
                  <li key={String(row.id ?? index)}>{String(row.status ?? 'Return request')}</li>
                );
              })}
              {(returnsQuery.data?.length ?? 0) === 0 ? (
                <li className="text-neutral-500 dark:text-neutral-400">No return requests.</li>
              ) : null}
            </ul>
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel title="Order summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Subtotal</dt>
                <dd>
                  {formatCurrency(Number(totals.subtotal ?? 0), String(order.currency ?? 'LKR'))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Shipping</dt>
                <dd>
                  {formatCurrency(Number(totals.shipping ?? 0), String(order.currency ?? 'LKR'))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Tax</dt>
                <dd>{formatCurrency(Number(totals.tax ?? 0), String(order.currency ?? 'LKR'))}</dd>
              </div>
              {Number(totals.discount ?? 0) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-neutral-500 dark:text-neutral-400">Discount</dt>
                  <dd>
                    −{formatCurrency(Number(totals.discount ?? 0), String(order.currency ?? 'LKR'))}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-[var(--admin-line)] pt-2 font-medium">
                <dt>Grand total</dt>
                <dd>
                  {formatCurrency(Number(totals.grandTotal ?? 0), String(order.currency ?? 'LKR'))}
                </dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel title="Fulfillment">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Shipping method</dt>
                <dd className="text-right capitalize">
                  {String(order.shippingMethod ?? '—').replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Delivery</dt>
                <dd className="text-right capitalize">
                  {String(order.deliveryMethod ?? '—').replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Items</dt>
                <dd>{String(totals.totalQuantity ?? items.length)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Customer ID</dt>
                <dd className="font-mono text-xs">{String(order.customerId ?? '—')}</dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel title="Payment">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Method</dt>
                <dd className="capitalize">
                  {String(order.paymentMethod ?? '—').replace(/_/g, ' ')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Reference</dt>
                <dd className="font-mono text-xs">{String(order.paymentReference ?? '—')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Placed</dt>
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
              <pre className="mt-3 max-h-40 overflow-auto rounded bg-neutral-50 p-3 text-xs dark:bg-white/5">
                {JSON.stringify(invoiceQuery.data, null, 2)}
              </pre>
            ) : null}
          </AdminPanel>

          {orderPerms.update ? (
            <AdminPanel title="Update status">
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                className="mb-3 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 py-2 text-sm"
              >
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
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
                className="mb-3 min-h-24 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 py-2 text-sm"
                placeholder="Add a note for staff"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => noteMutation.mutate()}
                disabled={!note.trim() || noteMutation.isPending}
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
