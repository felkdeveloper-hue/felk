import { useState, type FormEvent } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import { PackageSearch } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants';
import { ordersApi, type GuestOrderTrackResult } from '@/services/sdk/orders';
import { formatCurrency, formatDate } from '@/utils/format';
import { AppError } from '@/lib/errors';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_shipment: 'Ready to ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
};

export function TrackOrderPage() {
  const search = useSearch({ strict: false }) as { orderNumber?: string; email?: string };
  const [orderNumber, setOrderNumber] = useState(search.orderNumber ?? '');
  const [email, setEmail] = useState(search.email ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<GuestOrderTrackResult | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    setResult(null);
    try {
      const data = await ordersApi.trackGuest(orderNumber.trim(), email.trim());
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Seo
        title="Track order"
        description="Track your Fashion Edge order with your order number and email."
        noIndex
      />

      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="mb-8 text-center">
          <PackageSearch className="text-foreground mx-auto size-10" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Track your order</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your order number and the email on your account, or the phone number used on your
            guest delivery address.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="track-order-number">Order number</Label>
            <Input
              id="track-order-number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ORD-…"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-order-email">Email or phone</Label>
            <Input
              id="track-order-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com or 07XXXXXXXX"
              autoComplete="tel"
              required
            />
          </div>
          {error ? (
            <AuthErrorAlert
              error={AppError.isAppError(error) ? error : error}
              onRetry={() => setError(null)}
            />
          ) : null}
          <Button type="submit" className="w-full" loading={pending} disabled={pending}>
            Track order
          </Button>
        </form>

        {result ? (
          <div className="border-border mt-10 space-y-4 rounded-xl border p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Order</p>
                <p className="font-medium">{result.orderNumber}</p>
              </div>
              <p className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                {STATUS_LABELS[result.status] ?? result.status}
              </p>
            </div>

            {result.placedAt ? (
              <p className="text-muted-foreground text-sm">Placed {formatDate(result.placedAt)}</p>
            ) : null}

            <ul className="space-y-3 border-t pt-4">
              {result.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span>
                    {item.name}
                    {item.variantTitle ? (
                      <span className="text-muted-foreground"> · {item.variantTitle}</span>
                    ) : null}
                    <span className="text-muted-foreground"> × {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatCurrency(item.lineTotal, result.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="space-y-1 border-t pt-4 text-sm">
              {(result.totals.discount ?? 0) > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount</dt>
                  <dd>-{formatCurrency(result.totals.discount, result.currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd>{formatCurrency(result.totals.grandTotal, result.currency)}</dd>
              </div>
            </dl>

            <div className="text-muted-foreground space-y-1 border-t pt-4 text-xs">
              {result.shippedAt ? <p>Shipped {formatDate(result.shippedAt)}</p> : null}
              {result.deliveredAt ? <p>Delivered {formatDate(result.deliveredAt)}</p> : null}
              {!result.shippedAt && !result.deliveredAt && !result.cancelledAt ? (
                <p>We will update this page as your order moves through fulfilment.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <p className="text-muted-foreground mt-8 text-center text-sm">
          Have an account?{' '}
          <Link
            to={ROUTES.accountOrders}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            View orders in your account
          </Link>
        </p>
      </div>
    </>
  );
}
