import type { OrderAddressSnapshot, OrderLineItem, OrderTotals } from '@/services/sdk';
import { formatCurrency } from '@/utils/format';
import { Separator } from '@/components/ui/separator';

export function OrderAddressBlock({
  title,
  address,
}: {
  title: string;
  address: OrderAddressSnapshot | null;
}) {
  if (!address) return null;

  return (
    <div className="border-border rounded-xl border p-4 text-sm">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2">{address.fullName}</p>
      {address.phone ? <p className="text-muted-foreground">{address.phone}</p> : null}
      <p className="text-muted-foreground mt-1">
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ''}, {address.city} {address.postalCode},{' '}
        {address.country}
      </p>
    </div>
  );
}

export function OrderItemsList({ items, currency }: { items: OrderLineItem[]; currency: string }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt=""
              className="size-16 rounded-lg border object-cover"
            />
          ) : (
            <div className="bg-muted size-16 rounded-lg border" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.name}</p>
            {item.variantTitle ? (
              <p className="text-muted-foreground text-sm">{item.variantTitle}</p>
            ) : null}
            <p className="text-muted-foreground text-sm">
              SKU {item.sku} · Qty {item.quantity}
            </p>
          </div>
          <p className="shrink-0 font-medium">{formatCurrency(item.lineTotal, currency)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotalsSummary({
  totals,
  currency,
}: {
  totals: OrderTotals;
  currency: string;
}) {
  const summary = totals;

  return (
    <div className="border-border rounded-xl border p-4">
      <h3 className="font-medium">Order total</h3>
      <Separator className="my-4" />
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatCurrency(summary.subtotal, currency)}</dd>
        </div>
        {summary.discount > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <dt>Discount</dt>
            <dd>-{formatCurrency(summary.discount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>{formatCurrency(summary.shipping, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd>{formatCurrency(summary.tax, currency)}</dd>
        </div>
        {(summary.giftCard ?? 0) > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <dt>Gift card</dt>
            <dd>-{formatCurrency(summary.giftCard ?? 0, currency)}</dd>
          </div>
        ) : null}
      </dl>
      <Separator className="my-4" />
      <div className="flex justify-between text-base font-semibold">
        <span>Grand total</span>
        <span>{formatCurrency(summary.grandTotal, currency)}</span>
      </div>
    </div>
  );
}
