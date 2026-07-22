import type { LucideIcon } from 'lucide-react';
import { Banknote, Check, CreditCard, RefreshCcw, ShieldCheck, WalletCards, X } from 'lucide-react';
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

function paymentItem(option: ProductPaymentOption): TrustItem {
  if (option === 'cod') {
    return {
      key: 'payment',
      icon: Banknote,
      title: 'Cash on Delivery',
      subtitle: 'Available',
      detail: 'Pay when your order arrives',
      available: true,
    };
  }
  if (option === 'prepaid') {
    return {
      key: 'payment',
      icon: CreditCard,
      title: 'Prepaid Only',
      subtitle: 'Online payment',
      detail: 'COD is not available for this item',
      available: true,
    };
  }
  return {
    key: 'payment',
    icon: WalletCards,
    title: 'COD & Prepaid',
    subtitle: 'Available',
    detail: 'Pay online or on delivery',
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
          title: 'Returns & Refunds',
          subtitle: 'Available',
          available: true,
        }
      : {
          key: 'returns',
          icon: RefreshCcw,
          title: 'Returns & Refunds',
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
      className={cn('border-border/60 border-t pt-8', className)}
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.22em]">
            Assurances
          </p>
          <h2 className="font-display text-foreground mt-1 text-lg font-bold tracking-tight sm:text-xl">
            Shop with confidence
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map((item, index) => (
          <article
            key={item.key}
            className={cn(
              'group relative overflow-hidden rounded-2xl border p-4 transition duration-300 sm:p-5',
              'hover:shadow-elevated hover:-translate-y-0.5',
              item.available
                ? 'border-border/70 bg-linear-to-b from-background to-muted/35'
                : 'border-border/50 bg-muted/20 opacity-90',
            )}
            style={{ transitionDelay: `${index * 40}ms` }}
          >
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute -right-6 -top-8 size-24 rounded-full blur-2xl transition-opacity duration-300',
                item.available
                  ? 'bg-[#E8C547]/15 opacity-80 group-hover:opacity-100'
                  : 'bg-foreground/5 opacity-40',
              )}
            />

            <div className="relative flex items-start justify-between gap-3">
              <div
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl ring-1 transition duration-300',
                  item.available
                    ? 'bg-[#E8C547]/12 text-foreground ring-[#E8C547]/35 group-hover:scale-105'
                    : 'bg-muted text-muted-foreground ring-border/60',
                )}
              >
                <item.icon className="size-5" strokeWidth={1.75} />
              </div>

              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
                  item.available
                    ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground ring-border/70 ring-1',
                )}
              >
                {item.available ? (
                  <Check className="size-3 stroke-[2.5]" aria-hidden />
                ) : (
                  <X className="size-3 stroke-[2.5]" aria-hidden />
                )}
                {item.available ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="relative mt-4 space-y-1.5">
              <p className="font-display text-foreground text-sm font-bold uppercase tracking-[0.08em]">
                {item.title}
              </p>
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.16em]',
                  item.available
                    ? 'text-amber-700/90 dark:text-amber-200/90'
                    : 'text-muted-foreground',
                )}
              >
                {item.subtitle}
              </p>
              {item.detail ? (
                <p className="text-muted-foreground pt-1 text-xs leading-relaxed">{item.detail}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
