import { formatCurrency } from '@/utils';
import type { CartTotals, CartValidationResult } from '@/services/sdk';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export interface CartOrderSummaryProps {
  totals: CartTotals;
  validation?: CartValidationResult;
}

export function CartOrderSummary({ totals, validation }: CartOrderSummaryProps) {
  const currency = totals.currency ?? 'LKR';

  return (
    <aside className="border-border bg-card space-y-4 rounded-xl border p-5">
      <h2 className="text-base font-semibold">Price summary</h2>

      {validation && !validation.isValid ? (
        <Alert variant="warning">
          <AlertDescription>Some items need attention before checkout.</AlertDescription>
        </Alert>
      ) : null}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatCurrency(totals.subtotal, currency)}</dd>
        </div>
        {totals.discount > 0 ? (
          <div className="text-success flex justify-between">
            <dt>Discount</dt>
            <dd>-{formatCurrency(totals.discount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping estimate</dt>
          <dd>
            {totals.shipping > 0
              ? formatCurrency(totals.shipping, currency)
              : 'Calculated at checkout'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax estimate</dt>
          <dd>
            {totals.tax > 0 ? formatCurrency(totals.tax, currency) : 'Calculated at checkout'}
          </dd>
        </div>
      </dl>

      <Separator />

      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(totals.total, currency)}</span>
      </div>
    </aside>
  );
}
