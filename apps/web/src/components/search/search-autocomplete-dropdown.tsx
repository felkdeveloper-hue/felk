import { Link } from '@tanstack/react-router';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { Product } from '@/services/sdk';
import { Image } from '@/components/media/image';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { ROUTES } from '@/constants';

export interface SearchAutocompleteDropdownProps {
  query: string;
  products: Product[];
  isLoading?: boolean;
  onSelect: (product: Product) => void;
  onViewAll: () => void;
  className?: string;
  lightChrome?: boolean;
}

function productPrice(product: Product): string {
  const money = product.effectivePrice ?? product.salePrice ?? product.price;
  if (!money) return '';
  return formatCurrency(money.amount, money.currency);
}

export function SearchAutocompleteDropdown({
  query,
  products,
  isLoading,
  onSelect,
  onViewAll,
  className,
  lightChrome,
}: SearchAutocompleteDropdownProps) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  return (
    <div
      role="listbox"
      aria-label="Search suggestions"
      className={cn(
        'absolute left-0 right-0 top-[calc(100%+6px)] z-[110] overflow-hidden border shadow-[0_16px_40px_-12px_rgba(0,0,0,0.22)]',
        lightChrome
          ? 'border-white/20 bg-neutral-950/95 text-white backdrop-blur-md'
          : 'border-border bg-background text-foreground shadow-lg',
        className,
      )}
    >
      {isLoading && products.length === 0 ? (
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-xs',
            lightChrome ? 'text-white/60' : 'text-muted-foreground',
          )}
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Searching…
        </div>
      ) : null}

      {!isLoading && products.length === 0 ? (
        <p
          className={cn(
            'px-4 py-3 text-xs',
            lightChrome ? 'text-white/60' : 'text-muted-foreground',
          )}
        >
          No products found for &ldquo;{trimmed}&rdquo;
        </p>
      ) : null}

      {products.length > 0 ? (
        <ul className="max-h-[min(22rem,60vh)] overflow-y-auto overscroll-contain">
          {products.map((product) => (
            <li key={product.id} role="option">
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  lightChrome
                    ? 'hover:bg-white/10 active:bg-white/15'
                    : 'hover:bg-muted/70 active:bg-muted',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(product)}
              >
                <div
                  className={cn(
                    'relative size-11 shrink-0 overflow-hidden bg-neutral-100',
                    lightChrome ? 'ring-1 ring-white/15' : 'ring-border/60 ring-1',
                  )}
                >
                  {product.thumbnailUrl ? (
                    <Image
                      src={product.thumbnailUrl}
                      alt=""
                      objectFit="contain"
                      className="size-full p-1"
                      sizes="44px"
                    />
                  ) : (
                    <span
                      className={cn(
                        'flex size-full items-center justify-center text-[10px] font-semibold uppercase',
                        lightChrome ? 'text-white/40' : 'text-muted-foreground',
                      )}
                    >
                      FE
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-tight">{product.name}</p>
                  {productPrice(product) ? (
                    <p
                      className={cn(
                        'mt-0.5 text-[11px] tabular-nums',
                        lightChrome ? 'text-white/55' : 'text-muted-foreground',
                      )}
                    >
                      {productPrice(product)}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {products.length > 0 || isLoading ? (
        <div className={cn('border-t', lightChrome ? 'border-white/10' : 'border-border/70')}>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-medium tracking-wide transition-colors',
              lightChrome ? 'text-white/80 hover:bg-white/10' : 'text-foreground hover:bg-muted/60',
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onViewAll}
          >
            <span>View all results for &ldquo;{trimmed}&rdquo;</span>
            <ArrowRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Mobile list variant — full width rows inside floating search. */
export function SearchAutocompleteList({
  query,
  products,
  isLoading,
  onSelect,
  onViewAll,
}: Omit<SearchAutocompleteDropdownProps, 'className' | 'lightChrome'>) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  if (isLoading && products.length === 0) {
    return (
      <section className="mb-6 space-y-2">
        <h2 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
          Products
        </h2>
        <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Searching…
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="mb-6 space-y-2">
      <h2 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
        Products
      </h2>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:opacity-70"
              onClick={() => onSelect(product)}
            >
              <div className="bg-muted relative size-12 shrink-0 overflow-hidden">
                {product.thumbnailUrl ? (
                  <Image
                    src={product.thumbnailUrl}
                    alt=""
                    objectFit="contain"
                    className="size-full p-1"
                    sizes="48px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{product.name}</p>
                {productPrice(product) ? (
                  <p className="text-muted-foreground text-sm tabular-nums">
                    {productPrice(product)}
                  </p>
                ) : null}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Link
        to={ROUTES.search}
        search={{ q: trimmed }}
        onClick={onViewAll}
        className="text-muted-foreground flex min-h-11 items-center gap-2 text-sm font-medium"
      >
        View all results for &ldquo;{trimmed}&rdquo;
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
