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
}: PriceDisplayProps) {
  const display = salePrice ?? price;
  const original = salePrice && price ? price : compareAtPrice;

  if (!display || display.amount <= 0) return null;

  const offPercent = resolveDiscountPercent(display, original, discountPercent);

  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span
        className={cn(
          'text-foreground font-bold tracking-tight',
          size === 'md' ? 'text-xl' : 'text-[15px] sm:text-base',
        )}
      >
        {formatCurrency(display.amount, display.currency)}
      </span>
      {original && original.amount > display.amount ? (
        <span
          className={cn(
            'text-muted-foreground line-through',
            size === 'md' ? 'text-sm' : 'text-xs',
          )}
        >
          {formatCurrency(original.amount, original.currency)}
        </span>
      ) : null}
      {offPercent && offPercent > 0 ? (
        <span className={cn('text-success font-semibold', size === 'md' ? 'text-sm' : 'text-xs')}>
          {Math.round(offPercent)}% OFF
        </span>
      ) : null}
    </div>
  );
}
