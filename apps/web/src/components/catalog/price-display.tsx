import { formatCurrency } from '@/utils';
import type { ProductMoney } from '@/services/sdk';
import { cn } from '@/lib/utils';
import { BnplInstallmentHint } from './bnpl-installment-hint';

export interface PriceDisplayProps {
  price?: ProductMoney;
  salePrice?: ProductMoney;
  compareAtPrice?: ProductMoney;
  discountPercent?: number;
  className?: string;
  size?: 'sm' | 'md';
  /** Premium PDP layout: struck original, red sale, SAVE badge. */
  premium?: boolean;
  /** Show Mintpay / KOKO installment lines under the price. Default true. */
  showInstallments?: boolean;
}

function resolveDiscountPercent(
  display: ProductMoney,
  original: ProductMoney | undefined,
  discountPercent?: number,
): number | undefined {
  if (typeof discountPercent === 'number' && discountPercent > 0) {
    return discountPercent;
  }
  if (original && original.amount > display.amount) {
    return ((original.amount - display.amount) / original.amount) * 100;
  }
  return undefined;
}

export function PriceDisplay({
  price,
  salePrice,
  compareAtPrice,
  discountPercent,
  className,
  size = 'sm',
  premium = false,
  showInstallments = true,
}: PriceDisplayProps) {
  const liveSale = salePrice && salePrice.amount > 0 ? salePrice : undefined;
  const display = liveSale ?? price;
  const original = liveSale && price && price.amount > liveSale.amount ? price : compareAtPrice;

  if (!display || display.amount <= 0) return null;

  const offPercent = resolveDiscountPercent(display, original, discountPercent);
  const onSale = Boolean(original && original.amount > display.amount);
  const installmentBlock = showInstallments ? (
    <BnplInstallmentHint
      amount={display.amount}
      currency={display.currency}
      size={size === 'md' || premium ? 'md' : 'sm'}
    />
  ) : null;

  if (premium) {
    return (
      <div className="space-y-1">
        <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
          {onSale ? (
            <span className="text-muted-foreground text-sm line-through sm:text-base">
              {formatCurrency(original!.amount, original!.currency)}
            </span>
          ) : null}
          <span
            className={cn(
              'font-bold tracking-tight',
              onSale ? 'text-accent' : 'text-foreground',
              size === 'md' ? 'text-2xl' : 'text-lg',
            )}
          >
            {formatCurrency(display.amount, display.currency)}
          </span>
          {offPercent && offPercent > 0 ? (
            <span className="bg-accent text-accent-foreground rounded-none px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
              Save {Math.round(offPercent)}%
            </span>
          ) : null}
        </div>
        {installmentBlock}
      </div>
    );
  }

  const priceSize = size === 'md' ? 'text-base sm:text-lg' : 'text-[15px] sm:text-sm';

  return (
    <div className="space-y-0 max-lg:space-y-0 lg:space-y-0.5">
      <div
        className={cn(
          'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 max-lg:gap-x-1.5',
          className,
        )}
      >
        {onSale ? (
          <span
            className={cn(
              'text-muted-foreground line-through max-lg:text-[11px] max-lg:text-neutral-400',
              priceSize,
            )}
          >
            {formatCurrency(original!.amount, original!.currency)}
          </span>
        ) : null}
        <span
          className={cn(
            'font-semibold tracking-tight max-lg:text-[14px] max-lg:font-semibold',
            onSale
              ? 'text-red-600 max-lg:text-[#b91c1c] dark:text-red-500 max-lg:dark:text-[#dc2626]'
              : 'text-foreground max-lg:font-medium',
            priceSize,
          )}
        >
          {formatCurrency(display.amount, display.currency)}
        </span>
      </div>
      {installmentBlock}
    </div>
  );
}
