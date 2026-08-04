import type { LucideIcon } from 'lucide-react';
import { Check, CreditCard, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProductPaymentOption = 'cod' | 'prepaid' | 'both';

export interface ProductTrustBadgesProps {
  paymentOption?: ProductPaymentOption;
  returnsAvailable?: boolean;
  returnsCriteria?: string | null;
  warrantyAvailable?: boolean;
  warrantyDetails?: string | null;
  className?: string;
}

type TrustItem = {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  detail?: string;
  available: boolean;
};

function paymentItem(_option: ProductPaymentOption): TrustItem {
  // Store is prepaid-only — never advertise COD on the storefront.
  return {
    key: 'payment',
    icon: CreditCard,
    title: 'Prepaid Only',
    subtitle: 'Online payment',
    detail: 'All orders are paid online before dispatch',
    available: true,
  };
}

export function ProductTrustBadges({
  paymentOption = 'both',
  returnsAvailable = true,
  warrantyAvailable = false,
  className,
}: ProductTrustBadgesProps) {
  const items: TrustItem[] = [
    paymentItem(paymentOption),
    returnsAvailable
      ? {
          key: 'returns',
          icon: RefreshCcw,
          title: 'Exchanges',
          subtitle: 'Customer-paid',
          detail: 'No refunds. Customer covers exchange shipping costs.',
          available: true,
        }
      : {
          key: 'returns',
          icon: RefreshCcw,
          title: 'Exchanges',
          subtitle: 'Not available',
          available: false,
        },
    warrantyAvailable
      ? {
          key: 'warranty',
          icon: ShieldCheck,
          title: 'Warranty',
          subtitle: 'Covered',
          available: true,
        }
      : {
          key: 'warranty',
          icon: ShieldCheck,
          title: 'Warranty',
          subtitle: 'Not included',
          available: false,
        },
  ];

  return (
    <section
      aria-label="Purchase assurances"
      className={cn('border-border/60 border-t pt-5 lg:pt-8', className)}
    >
      <div className="mb-3 flex items-end justify-between gap-3 lg:mb-4">
        <div>
          <p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-[0.2em] lg:text-[10px] lg:tracking-[0.22em]">
            Assurances
          </p>
          <h2 className="font-display text-foreground mt-0.5 text-base font-bold tracking-tight lg:mt-1 lg:text-lg xl:text-xl">
            Shop with confidence
          </h2>
        </div>
      </div>

      {/* Mobile: single compact row · Desktop: spacious 3-col cards */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-4">
        {items.map((item, index) => (
          <article
            key={item.key}
            className={cn(
              'group relative overflow-hidden rounded-lg border transition duration-300 lg:rounded-2xl',
              'p-2 sm:p-3 lg:p-5',
              'lg:hover:shadow-elevated lg:hover:-translate-y-0.5',
              item.available
                ? 'border-border/70 bg-linear-to-b from-background to-muted/35'
                : 'border-border/50 bg-muted/20 opacity-90',
            )}
            style={{ transitionDelay: `${index * 40}ms` }}
          >
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute -right-6 -top-8 size-24 rounded-full blur-2xl transition-opacity duration-300 max-lg:hidden',
                item.available
                  ? 'bg-[#E8C547]/15 opacity-80 group-hover:opacity-100'
                  : 'bg-foreground/5 opacity-40',
              )}
            />

            <div className="relative flex items-start justify-between gap-1 lg:gap-3">
              <div
                className={cn(
                  'flex items-center justify-center rounded-md ring-1 transition duration-300 lg:rounded-xl',
                  'size-7 lg:size-11',
                  item.available
                    ? 'bg-[#E8C547]/12 text-foreground ring-[#E8C547]/35 lg:group-hover:scale-105'
                    : 'bg-muted text-muted-foreground ring-border/60',
                )}
              >
                <item.icon className="size-3.5 lg:size-5" strokeWidth={1.75} />
              </div>

              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-sm px-1 py-px text-[8px] font-bold uppercase tracking-[0.08em] lg:gap-1 lg:rounded-full lg:px-2 lg:py-0.5 lg:text-[10px] lg:tracking-[0.12em]',
                  item.available
                    ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground ring-border/70 ring-1',
                )}
              >
                {item.available ? (
                  <Check className="size-2.5 stroke-[2.5] lg:size-3" aria-hidden />
                ) : (
                  <X className="size-2.5 stroke-[2.5] lg:size-3" aria-hidden />
                )}
                <span className="max-lg:sr-only">{item.available ? 'Yes' : 'No'}</span>
              </span>
            </div>

            <div className="relative mt-2 space-y-0.5 lg:mt-4 lg:space-y-1.5">
              <p className="font-display text-foreground text-[9px] font-bold uppercase leading-tight tracking-[0.04em] sm:text-[10px] lg:text-sm lg:tracking-[0.08em]">
                {item.title}
              </p>
              <p
                className={cn(
                  'text-[8px] font-semibold uppercase leading-tight tracking-[0.1em] sm:text-[9px] lg:text-[11px] lg:tracking-[0.16em]',
                  item.available
                    ? 'text-amber-700/90 dark:text-amber-200/90'
                    : 'text-muted-foreground',
                )}
              >
                {item.subtitle}
              </p>
              {item.detail ? (
                <p className="text-muted-foreground hidden pt-1 text-xs leading-relaxed lg:block">
                  {item.detail}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
