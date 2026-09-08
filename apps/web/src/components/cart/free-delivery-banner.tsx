import { CheckCircle2, Truck } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import {
  FIXED_SHIPPING_AMOUNT,
  FREE_SHIPPING_THRESHOLD,
  isFreeDeliveryUnlocked,
  remainingForFreeDelivery,
} from '@/constants/checkout.constants';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface FreeDeliveryBannerProps {
  subtotal: number;
  currency?: string;
  compact?: boolean;
  className?: string;
}

export function freeDeliveryProgressPercent(subtotal: number): number {
  if (FREE_SHIPPING_THRESHOLD <= 0) return 100;
  return Math.min(100, Math.max(0, (Math.max(0, subtotal) / FREE_SHIPPING_THRESHOLD) * 100));
}

export function ShippingFeeLabel({
  amount,
  currency = 'LKR',
  unlocked = false,
}: {
  amount: number;
  currency?: string;
  unlocked?: boolean;
}) {
  if (amount > 0) {
    return <span>{formatCurrency(amount, currency)}</span>;
  }

  return (
    <span className="font-semibold text-emerald-700">
      {unlocked ? (
        <>
          <span className="text-muted-foreground mr-1.5 text-xs font-normal line-through">
            {formatCurrency(FIXED_SHIPPING_AMOUNT, currency)}
          </span>
          FREE
        </>
      ) : (
        'FREE'
      )}
    </span>
  );
}

export function FreeDeliveryBanner({
  subtotal,
  currency = 'LKR',
  compact = false,
  className,
}: FreeDeliveryBannerProps) {
  const unlocked = isFreeDeliveryUnlocked(subtotal);
  const remaining = remainingForFreeDelivery(subtotal);
  const percent = freeDeliveryProgressPercent(subtotal);
  const thresholdLabel = formatCurrency(FREE_SHIPPING_THRESHOLD, currency);

  if (compact) {
    return (
      <div
        role="status"
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold',
          unlocked
            ? 'border border-emerald-300/80 bg-emerald-50 text-emerald-800'
            : 'border border-amber-300/80 bg-amber-50 text-amber-950',
          className,
        )}
      >
        {unlocked ? (
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <Truck className="size-3.5 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 leading-snug">
          {unlocked
            ? 'FREE delivery unlocked — shipping is on us'
            : subtotal > 0
              ? `Shop ${formatCurrency(remaining, currency)} more to unlock free delivery`
              : `Shop ${thresholdLabel} to unlock free delivery`}
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5',
        unlocked
          ? 'border-emerald-300/90 bg-emerald-50 text-emerald-950'
          : 'bg-linear-to-br border-amber-300/90 from-amber-50 to-orange-50 text-amber-950',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
            unlocked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white',
          )}
          aria-hidden
        >
          {unlocked ? <CheckCircle2 className="size-4" /> : <Truck className="size-4" />}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-bold leading-snug sm:text-[15px]">
            {unlocked
              ? 'FREE delivery unlocked'
              : subtotal > 0
                ? `Shop ${formatCurrency(remaining, currency)} more for FREE delivery`
                : `Unlock FREE delivery at ${thresholdLabel}`}
          </p>
          <p className="text-xs leading-snug sm:text-[13px]">
            {unlocked
              ? `Your bag is ${thresholdLabel}+ — island-wide shipping is free.`
              : `Free island-wide delivery on bags of ${thresholdLabel} or more.`}
          </p>
          {!unlocked ? (
            <div className="pt-0.5">
              <Progress
                value={percent}
                className="**:data-[slot=progress-indicator]:bg-amber-600 h-2 bg-amber-200/80"
              />
              <p className="text-muted-foreground mt-1 text-[11px] font-medium">
                {formatCurrency(subtotal, currency)} of {thresholdLabel}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
