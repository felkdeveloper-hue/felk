import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Download, Mail, Loader2, Truck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@fe-platform/ui';
import { toast } from 'sonner';
import { AdminErrorState, AdminPageHeader, AdminPanel, PageMotion } from '@/components/admin';
import { InvoiceView } from '@/components/orders';
import { Image } from '@/components/media/image';
import { Button as UiButton } from '@/components/ui/button';
import { env } from '@/config/env';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ADMIN_ROUTES, QUERY_KEYS } from '@/constants';
import {
  ORDER_STATUS_CONFIG,
  ORDER_STATUS_EMAIL_PREVIEW,
  ORDER_STATUS_TRANSITIONS,
} from '@/constants/order.constants';
import { useAdminPermissions } from '@/hooks/admin';
import { AppError } from '@/lib/errors';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { formatOrderAddress, ordersApi, type AdminOrderAddress } from '@/services/sdk/admin';
import { orderReceivedAt } from '@/utils/orders';

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function resolveOrderItemImage(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/') && env.apiOrigin) {
    return `${env.apiOrigin.replace(/\/$/, '')}${value}`;
  }
  if (value.startsWith('/uploads/') && env.cdnUrl) {
    return `${env.cdnUrl.replace(/\/$/, '')}${value}`;
  }
  return value;
}

function readItemImage(row: Record<string, unknown>): string | undefined {
  const images = Array.isArray(row.images) ? row.images : [];
  const first = images.find((image) => typeof image === 'string' && image.length > 0);
  return resolveOrderItemImage(first);
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
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [existingWaybillId, setExistingWaybillId] = useState('');
  const [useExistingWaybill, setUseExistingWaybill] = useState(false);

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
    enabled: invoiceOpen,
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: () => ordersApi.sendInvoice(orderId),
    onSuccess: (result) => {
      toast.success(`Invoice emailed to ${result.email}`);
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to send invoice');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (targetStatus: string) =>
      targetStatus === 'cancelled'
        ? ordersApi.cancel(orderId)
        : ordersApi.updateStatus(orderId, targetStatus),
    onSuccess: (_result, targetStatus) => {
      toast.success(
        `Order marked as ${ORDER_STATUS_CONFIG[targetStatus]?.label ?? targetStatus}. Customer notified by email.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOrders.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOrders.timeline(orderId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.stats() });
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to update order status');
    },
  });

  const noteMutation = useMutation({
    mutationFn: () => ordersApi.addNote(orderId, note),
    onSuccess: () => {
      setNote('');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOrders.timeline(orderId) });
    },
  });

  const fedShipmentMutation = useMutation({
    mutationFn: () =>
      ordersApi.createFedShipment(orderId, {
        mode: useExistingWaybill ? 'existing' : 'new',
        waybillId: useExistingWaybill ? existingWaybillId.trim() : undefined,
      }),
    onSuccess: () => {
      toast.success('FED waybill created. Tracking will update when FED sends status callbacks.');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOrders.detail(orderId) });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminOrders.timeline(orderId) });
    },
    onError: (error) => {
      toast.error(error instanceof AppError ? error.message : 'Unable to create FED waybill');
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
  const receivedAt = orderReceivedAt(order);
  const allowedStatuses = (ORDER_STATUS_TRANSITIONS[status] ?? []).filter((candidate) =>
    candidate === 'cancelled' ? orderPerms.cancel : orderPerms.update,
  );
  const selectedStatus = allowedStatuses.includes(nextStatus)
    ? nextStatus
    : (allowedStatuses[0] ?? '');
  const shipment = readRecord(order.shipment ?? readRecord(order.metadata).shipment);
  const tracking = readRecord(order.tracking ?? readRecord(order.metadata).tracking);
  const waybillNo = String(shipment.waybillNo ?? tracking.trackingNumber ?? '');
  const fedStatus = String(shipment.fedStatus ?? tracking.lastCourierStatus ?? '');
  const fedStatusUpdatedAt = String(
    shipment.fedStatusUpdatedAt ?? tracking.lastCourierUpdateAt ?? '',
  );
  const source = readRecord(order.source);
  const sourceLabel = String(source.label ?? 'Unknown');
  const sourceMeta = [source.channel, source.detail].filter(Boolean).join(' · ');

  const downloadInvoicePdf = async () => {
    try {
      setDownloadingInvoice(true);
      await ordersApi.downloadInvoicePdf(orderId);
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Unable to download invoice PDF');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const downloadShippingLabelPdf = async () => {
    try {
      setDownloadingLabel(true);
      await ordersApi.downloadShippingLabelPdf(orderId);
    } catch (error) {
      toast.error(error instanceof AppError ? error.message : 'Unable to download shipping label');
    } finally {
      setDownloadingLabel(false);
    }
  };

  return (
    <PageMotion>
      <AdminPageHeader
        title={`Order ${String(order.orderNumber ?? orderId)}`}
        description={`Received ${receivedAt ? formatDate(receivedAt) : '—'}`}
        actions={
          <Link to={ADMIN_ROUTES.orders}>
            <Button variant="outline" size="sm">
              Back to orders
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminPanel>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Source
          </p>
          <p className="mt-2 font-medium">{sourceLabel}</p>
          {sourceMeta ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{sourceMeta}</p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs">Where this customer arrived from</p>
          )}
        </AdminPanel>
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
                const productId = row.productId ? String(row.productId) : '';
                const imageUrl = readItemImage(row);
                return (
                  <li
                    key={String(row.id ?? row._id ?? index)}
                    className="flex items-start gap-3 border-b border-[var(--admin-line)] pb-3 last:border-0 last:pb-0"
                  >
                    {productId ? (
                      <Link
                        to={ADMIN_ROUTES.productDetail}
                        params={{ productId }}
                        className="bg-muted relative size-14 shrink-0 overflow-hidden ring-1 ring-[var(--admin-line)] transition-opacity hover:opacity-85"
                        title="Open product"
                      >
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={String(row.name ?? row.productName ?? 'Product')}
                            className="size-full object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <span className="text-muted-foreground flex size-full items-center justify-center text-[10px] font-semibold uppercase">
                            FE
                          </span>
                        )}
                      </Link>
                    ) : (
                      <div className="bg-muted relative size-14 shrink-0 overflow-hidden ring-1 ring-[var(--admin-line)]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={String(row.name ?? row.productName ?? 'Product')}
                            className="size-full object-cover"
                            sizes="56px"
                          />
                        ) : null}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--admin-ink)]">
                        {String(row.name ?? row.productName ?? 'Item')}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {String(row.variantTitle ?? '')} · SKU {String(row.sku ?? '—')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
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
                <dt className="text-neutral-500 dark:text-neutral-400">Received</dt>
                <dd>
                  {receivedAt ? formatDate(receivedAt) : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setInvoiceOpen(true)}>
                View invoice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void downloadInvoicePdf()}
                disabled={downloadingInvoice}
              >
                {downloadingInvoice ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-2 size-4" aria-hidden />
                )}
                {downloadingInvoice ? 'Downloading…' : 'Download invoice PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void downloadShippingLabelPdf()}
                disabled={downloadingLabel}
              >
                {downloadingLabel ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-2 size-4" aria-hidden />
                )}
                {downloadingLabel ? 'Downloading…' : 'Shipping label PDF'}
              </Button>
              {orderPerms.update ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => sendInvoiceMutation.mutate()}
                  disabled={sendInvoiceMutation.isPending}
                >
                  {sendInvoiceMutation.isPending ? 'Sending…' : 'Send to customer'}
                </Button>
              ) : null}
            </div>
          </AdminPanel>

          <AdminPanel title="FED Courier">
            {waybillNo ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">Waybill</dt>
                  <dd className="font-mono text-xs">{waybillNo}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">Courier status</dt>
                  <dd className="text-right capitalize">{fedStatus || 'Awaiting update'}</dd>
                </div>
                {fedStatusUpdatedAt ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500 dark:text-neutral-400">Last update</dt>
                    <dd className="text-right">{formatDate(fedStatusUpdatedAt)}</dd>
                  </div>
                ) : null}
                <div className="pt-2">
                  <a
                    href="https://www.fdedomestic.com/client/all_parcel.php"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Open in FED portal
                  </a>
                </div>
              </dl>
            ) : orderPerms.update ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Create a FED waybill for this FE order. The FE order number is sent to FED as the
                  reference so only your website orders are linked.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useExistingWaybill}
                    onChange={(event) => setUseExistingWaybill(event.target.checked)}
                  />
                  Use an existing CRE/CCP waybill number
                </label>
                {useExistingWaybill ? (
                  <input
                    value={existingWaybillId}
                    onChange={(event) => setExistingWaybillId(event.target.value)}
                    placeholder="Enter existing waybill ID"
                    className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 py-2 text-sm"
                  />
                ) : null}
                <Button
                  size="sm"
                  onClick={() => fedShipmentMutation.mutate()}
                  disabled={
                    fedShipmentMutation.isPending ||
                    (useExistingWaybill && !existingWaybillId.trim())
                  }
                >
                  {fedShipmentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 size-4" aria-hidden />
                      Create FED waybill
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No FED waybill has been created for this order yet.
              </p>
            )}
          </AdminPanel>

          {orderPerms.update || orderPerms.cancel ? (
            <AdminPanel title="Update status">
              {allowedStatuses.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor={`order-next-status-${orderId}`}
                      className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400"
                    >
                      New status
                    </label>
                    <select
                      id={`order-next-status-${orderId}`}
                      value={selectedStatus}
                      onChange={(event) => setNextStatus(event.target.value)}
                      className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 py-2 text-sm"
                    >
                      {allowedStatuses.map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {ORDER_STATUS_CONFIG[candidate]?.label ?? candidate.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedStatus && ORDER_STATUS_EMAIL_PREVIEW[selectedStatus] ? (
                    <div className="rounded-lg border border-[var(--admin-line)] bg-neutral-50 p-3 dark:bg-white/5">
                      <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        Automated email to customer
                      </p>
                      <p className="text-sm text-[var(--admin-ink)]">
                        Hi {shippingAddress?.fullName?.split(' ')[0] || 'there'},{' '}
                        {ORDER_STATUS_EMAIL_PREVIEW[selectedStatus]}
                      </p>
                      <p className="mt-2 text-xs text-neutral-400">
                        Sent automatically when you update the status — no message needed.
                      </p>
                    </div>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate(selectedStatus)}
                    disabled={!selectedStatus || statusMutation.isPending}
                  >
                    {statusMutation.isPending ? 'Updating…' : 'Update status & notify customer'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No further status changes are available.
                </p>
              )}
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

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl print:max-h-none print:max-w-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Invoice</DialogTitle>
            <DialogDescription>
              Download or print a copy, or email it to the customer.
            </DialogDescription>
          </DialogHeader>

          {invoiceQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading invoice…
            </div>
          ) : null}

          {invoiceQuery.isError ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">Unable to load invoice.</p>
              <Button variant="outline" size="sm" onClick={() => invoiceQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {invoiceQuery.data ? (
            <InvoiceView
              invoice={invoiceQuery.data}
              actions={
                orderPerms.update ? (
                  <UiButton
                    variant="outline"
                    onClick={() => sendInvoiceMutation.mutate()}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    {sendInvoiceMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Mail className="size-4" aria-hidden />
                    )}
                    {sendInvoiceMutation.isPending ? 'Sending…' : 'Send to customer'}
                  </UiButton>
                ) : null
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
