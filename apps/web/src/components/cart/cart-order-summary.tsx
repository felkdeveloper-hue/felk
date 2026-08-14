import { formatCurrency } from '@/utils';
import type { CartTotals, CartValidationResult } from '@/services/sdk';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { previewShippingAmount } from '@/constants/checkout.constants';
import { useAuthStore } from '@/store';
import { isStaffUser } from '@/utils/auth-redirect';

export interface CartOrderSummaryProps {
  totals: CartTotals;
  validation?: CartValidationResult;
}

export function CartOrderSummary({ totals, validation }: CartOrderSummaryProps) {
  const currency = totals.currency ?? 'LKR';
  const isStaff = isStaffUser(useAuthStore((state) => state.user));
  const shipping = previewShippingAmount(totals.shipping, isStaff);
  const displayTotal = totals.shipping > 0 ? totals.total : totals.total + shipping;

  return (
    <aside className="border-border bg-card space-y-4 rounded-xl border p-5">
      <h2 className="text-base font-semibold">Price summary</h2>

      {validation && !validation.isValid ? (
        <Alert variant="destructive">
          <AlertDescription>Remove out-of-stock items before you can checkout.</AlertDescription>
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
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>{formatCurrency(shipping, currency)}</dd>
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
        <span>{formatCurrency(displayTotal, currency)}</span>
      </div>
    </aside>
  );
}
