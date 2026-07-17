import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import {
  OrderAddressBlock,
  OrderItemsList,
  OrderStatusBadge,
  OrderTimeline,
  OrderTotalsSummary,
  OrderTrackingPanel,
  PaymentStatusBadge,
  ReturnRequestForm,
} from '@/components/orders';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/constants';
import {
  useOrderQuery,
  useOrderReturnsQuery,
  useOrderTimelineQuery,
  useRequestReturnMutation,
} from '@/hooks/orders';
import { formatCurrency, formatDate } from '@/utils/format';
import { ReturnStatusBadge } from '@/components/orders/order-status-badge';
import { useState } from 'react';

export function AccountOrderDetailPage() {
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const orderQuery = useOrderQuery(orderId);
  const timelineQuery = useOrderTimelineQuery(orderId);
  const returnsQuery = useOrderReturnsQuery(orderId);
  const returnMutation = useRequestReturnMutation();

  const order = orderQuery.data;
  const canReturn = order && ['delivered', 'completed'].includes(order.status);
  const customerNotes = timelineQuery.data?.filter((entry) => Boolean(entry.note)) ?? [];

  if (orderQuery.isLoading) {
    return (
      <>
        <Seo title="Order details" description="View order details." noIndex />
        <Skeleton className="h-96 w-full" aria-busy="true" />
      </>
    );
  }

  if (orderQuery.error) {
    return (
      <>
        <Seo title="Order details" description="View order details." noIndex />
        <AuthErrorAlert error={orderQuery.error} onRetry={() => orderQuery.refetch()} />
      </>
    );
  }

  if (!order) return null;

  return (
    <>
      <Seo title={`Order ${order.orderNumber}`} description="View order details." noIndex />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES.accountOrders}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to orders
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/account/orders/$orderId/invoice" params={{ orderId: order.id }}>
              <FileText className="size-4" aria-hidden />
              View invoice
            </Link>
          </Button>
          {canReturn ? (
            <Button size="sm" onClick={() => setReturnDialogOpen(true)}>
              <RotateCcw className="size-4" aria-hidden />
              Request return
            </Button>
          ) : null}
        </div>
      </div>

      <header className="border-border bg-card rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Placed {order.placedAt ? formatDate(order.placedAt) : '—'} ·{' '}
          {formatCurrency(order.totals.grandTotal, order.currency)}
        </p>
        {order.paymentMethod ? (
          <p className="text-muted-foreground mt-1 text-sm capitalize">
            Paid via {order.paymentMethod.replace('_', ' ')}
            {order.paymentReference ? ` · ${order.paymentReference}` : ''}
          </p>
        ) : null}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section aria-labelledby="order-items-heading">
            <h2 id="order-items-heading" className="text-lg font-semibold">
              Items
            </h2>
            <div className="mt-4">
              <OrderItemsList items={order.items} currency={order.currency} />
            </div>
          </section>

          <section aria-labelledby="order-timeline-heading">
            <h2 id="order-timeline-heading" className="text-lg font-semibold">
              Timeline
            </h2>
            <div className="border-border mt-4 rounded-xl border p-5">
              {timelineQuery.isLoading ? (
                <Skeleton className="h-48 w-full" aria-busy="true" />
              ) : (
                <OrderTimeline order={order} timeline={timelineQuery.data} />
              )}
            </div>
          </section>

          <section aria-labelledby="order-tracking-heading">
            <h2 id="order-tracking-heading" className="text-lg font-semibold">
              Tracking
            </h2>
            <div className="mt-4">
              <OrderTrackingPanel order={order} />
            </div>
          </section>

          {customerNotes.length > 0 ? (
            <section aria-labelledby="order-notes-heading">
              <h2 id="order-notes-heading" className="text-lg font-semibold">
                Updates
              </h2>
              <ul className="mt-4 space-y-3">
                {customerNotes.map((entry) => (
                  <li key={entry.id} className="border-border rounded-lg border p-4 text-sm">
                    <p>{entry.note}</p>
                    <p className="text-muted-foreground mt-1">{formatDate(entry.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {returnsQuery.data && returnsQuery.data.length > 0 ? (
            <section aria-labelledby="order-returns-heading">
              <h2 id="order-returns-heading" className="text-lg font-semibold">
                Return requests
              </h2>
              <ul className="mt-4 space-y-3">
                {returnsQuery.data.map((item) => (
                  <li key={item.id} className="border-border rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReturnStatusBadge status={item.status} />
                      <span className="text-muted-foreground text-sm">{item.reason}</span>
                    </div>
                    {item.description ? (
                      <p className="text-muted-foreground mt-2 text-sm">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="grid gap-4">
            <OrderAddressBlock title="Shipping address" address={order.shippingAddress} />
            <OrderAddressBlock title="Billing address" address={order.billingAddress} />
          </div>
          <OrderTotalsSummary totals={order.totals} currency={order.currency} />
        </aside>
      </div>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a return</DialogTitle>
            <DialogDescription>
              Submit a return request for items in order {order.orderNumber}.
            </DialogDescription>
          </DialogHeader>
          <ReturnRequestForm
            items={order.items}
            isSubmitting={returnMutation.isPending}
            onSubmit={(values) =>
              returnMutation.mutate(
                { orderId: order.id, payload: values },
                { onSuccess: () => setReturnDialogOpen(false) },
              )
            }
          />
          {returnMutation.error ? <AuthErrorAlert error={returnMutation.error} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
