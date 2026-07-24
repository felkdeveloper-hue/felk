import { useState } from 'react';
import { formatCurrency } from '@/utils/format';
import { getSetting } from '@/utils/cms';
import { usePublicSettings } from '@/hooks/cms';
import type { CheckoutSession } from '@/services/sdk';
import { Separator } from '@/components/ui/separator';

export interface CheckoutOrderSummaryProps {
  session: CheckoutSession;
}

function LineThumbnail({ src, storeName }: { src?: string; storeName: string }) {
  const [broken, setBroken] = useState(false);
  const showLogo = !src || broken;

  if (showLogo) {
    return (
      <div
        className="border-border bg-muted flex size-14 shrink-0 items-center justify-center rounded-2xl border"
        aria-hidden
      >
        <span className="font-display text-foreground text-sm font-bold uppercase tracking-[-0.04em]">
          {storeName}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="border-border size-14 shrink-0 rounded-2xl border object-cover"
      onError={() => setBroken(true)}
    />
  );
}

export function CheckoutOrderSummary({ session }: CheckoutOrderSummaryProps) {
  const { totals, lines, currency } = session;
  const { data: settings } = usePublicSettings();
  const storeName =
    getSetting<string>(settings, 'store.name') ?? getSetting<string>(settings, 'storeName') ?? 'FE';

  return (
    <aside className="border-border/70 bg-card/90 rounded-[1.75rem] border p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
      <h2 className="font-display text-lg font-bold uppercase tracking-tight">Order summary</h2>
      <ul className="mt-4 space-y-3">
        {lines.map((line) => (
          <li
            key={`${line.variantId}-${line.cartItemId ?? line.sku}`}
            className="flex gap-3 text-sm"
          >
            <LineThumbnail src={line.thumbnailUrl} storeName={storeName} />
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
