import { formatCurrency } from '@/utils';
import type { ProductMoney } from '@/services/sdk';
import { cn } from '@/lib/utils';

export interface PriceDisplayProps {
  price?: ProductMoney;
  salePrice?: ProductMoney;
  compareAtPrice?: ProductMoney;
  discountPercent?: number;
  className?: string;
  size?: 'sm' | 'md';
  /** Premium PDP layout: struck original, red sale, SAVE badge. */
  premium?: boolean;
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
}: PriceDisplayProps) {
  const display = salePrice ?? price;
  const original = salePrice && price ? price : compareAtPrice;

  if (!display || display.amount <= 0) return null;

  const offPercent = resolveDiscountPercent(display, original, discountPercent);
  const onSale = Boolean(original && original.amount > display.amount);

  if (premium) {
    return (
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
    );
  }

  const priceSize = size === 'md' ? 'text-base' : 'text-sm';

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      {/* Original price (struck through) always first */}
      {onSale ? (
        <span className={cn('text-muted-foreground line-through', priceSize)}>
          {formatCurrency(original!.amount, original!.currency)}
        </span>
      ) : null}
      {/* Current / sale price — red when on sale */}
      <span
        className={cn(
          'font-semibold tracking-tight',
          onSale ? 'text-red-600 dark:text-red-500' : 'text-foreground',
          priceSize,
        )}
      >
        {formatCurrency(display.amount, display.currency)}
      </span>
    </div>
  );
}
