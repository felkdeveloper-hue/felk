import { formatCurrency } from '@/utils';
import type { ProductMoney } from '@/services/sdk';
import { cn } from '@/lib/utils';

export interface PriceDisplayProps {
  price?: ProductMoney;
  salePrice?: ProductMoney;
  compareAtPrice?: ProductMoney;
  className?: string;
  size?: 'sm' | 'md';
}

export function PriceDisplay({
  price,
  salePrice,
  compareAtPrice,
  className,
  size = 'sm',
}: PriceDisplayProps) {
  const display = salePrice ?? price;
  const original = salePrice && price ? price : compareAtPrice;

  if (!display) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className={cn('text-foreground font-medium', size === 'md' && 'text-lg')}>
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
    </div>
  );
}
