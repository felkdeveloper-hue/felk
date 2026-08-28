import { formatCurrency } from '@/utils';
import type { CartTotals, CartValidationResult } from '@/services/sdk';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { previewShippingAmount } from '@/constants/checkout.constants';
import { useAuthStore } from '@/store';
import { isStaffUser } from '@/utils/auth-redirect';
import { Zap } from 'lucide-react';
import { useFlashSale } from '@/contexts/flash-sale-context';

export interface CartOrderSummaryProps {
  totals: CartTotals;
  validation?: CartValidationResult;
}

export function CartOrderSummary({ totals, validation }: CartOrderSummaryProps) {
  const currency = totals.currency ?? 'LKR';
  const authUser = useAuthStore((state) => state.user);
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const { isFlashSaleActive } = useFlashSale();
  const isStaff = isStaffUser(authUser);
  const shipping = previewShippingAmount(totals.shipping, isStaff);
  const displayTotal = totals.shipping > 0 ? totals.total : totals.total + shipping;

  // Flash sale: 20% off subtotal for logged-in users with active sale only
  const flashEnabled = isAuthed && isFlashSaleActive;
  const flashSubtotal = flashEnabled ? Math.round(totals.subtotal * 0.8) : null;
  const flashSaving = flashSubtotal !== null ? totals.subtotal - flashSubtotal : 0;
  const flashTotal =
    flashSubtotal !== null
      ? Math.round(flashSubtotal + shipping + (totals.tax ?? 0) - (totals.discount ?? 0))
      : null;

  return (
    <aside className="border-border bg-card space-y-4 rounded-xl border p-5">
      <h2 className="text-base font-semibold">Price summary</h2>

      {flashEnabled ? (
        <div
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold"
          style={{
            background: 'rgba(249,115,22,0.1)',
            color: '#f97316',
            border: '1px solid rgba(249,115,22,0.25)',
          }}
        >
          <Zap className="size-3 shrink-0" />
          Flash Sale — 20% OFF applied
        </div>
      ) : null}

      {validation && !validation.isValid ? (
        <Alert variant="destructive">
          <AlertDescription>Remove out-of-stock items before you can checkout.</AlertDescription>
        </Alert>
      ) : null}

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>
            {flashSubtotal !== null ? (
              <span className="flex items-baseline gap-1.5">
                <span className="text-muted-foreground text-xs line-through">
                  {formatCurrency(totals.subtotal, currency)}
                </span>
                <span className="font-semibold" style={{ color: '#f97316' }}>
                  {formatCurrency(flashSubtotal, currency)}
                </span>
              </span>
            ) : (
              formatCurrency(totals.subtotal, currency)
            )}
          </dd>
        </div>
        {flashSaving > 0 ? (
          <div className="flex justify-between" style={{ color: '#f97316' }}>
            <dt className="flex items-center gap-1">
              <Zap className="size-3" />
              Flash Sale (20% off)
            </dt>
            <dd>-{formatCurrency(flashSaving, currency)}</dd>
          </div>
        ) : null}
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
        <span style={flashTotal !== null ? { color: '#f97316' } : undefined}>
          {formatCurrency(flashTotal ?? displayTotal, currency)}
        </span>
      </div>
    </aside>
  );
}
