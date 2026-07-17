import { formatCurrency } from '@/utils/format';
import type { CheckoutSession } from '@/services/sdk';
import { Separator } from '@/components/ui/separator';

export interface CheckoutOrderSummaryProps {
  session: CheckoutSession;
}

export function CheckoutOrderSummary({ session }: CheckoutOrderSummaryProps) {
  const { totals, lines, currency } = session;

  return (
    <aside className="border-border/70 bg-card/90 rounded-[1.75rem] border p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
      <h2 className="font-display text-lg font-bold uppercase tracking-tight">Order summary</h2>
      <ul className="mt-4 space-y-3">
        {lines.map((line) => (
          <li
            key={`${line.variantId}-${line.cartItemId ?? line.sku}`}
            className="flex gap-3 text-sm"
          >
            {line.thumbnailUrl ? (
              <img
                src={line.thumbnailUrl}
                alt=""
                className="border-border size-14 rounded-2xl border object-cover"
              />
            ) : (
              <div className="border-border bg-muted size-14 rounded-2xl border" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{line.title}</p>
              {(line.colorName || line.sizeName) && (
                <p className="text-muted-foreground">
                  {[line.colorName, line.sizeName].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-muted-foreground">Qty {line.quantity}</p>
            </div>
            <p className="shrink-0 font-medium">{formatCurrency(line.lineSubtotal, currency)}</p>
          </li>
        ))}
      </ul>

      <Separator className="my-4" />

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatCurrency(totals.subtotal, currency)}</dd>
        </div>
        {totals.discount > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <dt>Discount</dt>
            <dd>-{formatCurrency(totals.discount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>{formatCurrency(totals.shipping, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd>{formatCurrency(totals.tax, currency)}</dd>
        </div>
        {(totals.giftCard ?? 0) > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <dt>Gift card</dt>
            <dd>-{formatCurrency(totals.giftCard ?? 0, currency)}</dd>
          </div>
        ) : null}
      </dl>

      <Separator className="my-4" />

      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(totals.grandTotal, currency)}</span>
      </div>
    </aside>
  );
}
