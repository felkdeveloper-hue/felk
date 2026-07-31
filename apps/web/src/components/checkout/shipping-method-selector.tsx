import { BadgeCheck, Clock3, ShieldCheck, Truck } from 'lucide-react';
import { FIXED_SHIPPING_AMOUNT, SHIPPING_METHOD_OPTIONS } from '@/constants/checkout.constants';
import { formatCurrency } from '@/utils/format';
import type { CheckoutSession, ShippingMethod } from '@/services/sdk';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface ShippingMethodSelectorProps {
  session: CheckoutSession;
  value: ShippingMethod;
  onChange: (method: ShippingMethod) => void;
  disabled?: boolean;
}

const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Tracked delivery' },
  { icon: BadgeCheck, label: 'Secure packaging' },
  { icon: Clock3, label: 'Estimated windows shown' },
] as const;

function estimateForMethod(session: CheckoutSession, method: ShippingMethod) {
  if (session.shippingMethod === method && session.shippingEstimate) {
    const estimate = session.shippingEstimate as {
      amount?: number;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
      label?: string;
    };
    return estimate;
  }
  return null;
}

function priceLabel(session: CheckoutSession, amount: number | undefined) {
  const { currency } = session;
  if (amount != null) return formatCurrency(amount, currency);
  const fallback = session.totals.shipping > 0 ? session.totals.shipping : FIXED_SHIPPING_AMOUNT;
  return formatCurrency(fallback, currency);
}

export function ShippingMethodSelector({
  session,
  value,
  onChange,
  disabled,
}: ShippingMethodSelectorProps) {
  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <legend className="sr-only">Shipping method</legend>

      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as ShippingMethod)}
        className="grid gap-3"
      >
        {SHIPPING_METHOD_OPTIONS.map((option) => {
          const estimate = estimateForMethod(session, option.id);
          const amount = estimate?.amount;
          const isSelected = value === option.id;
          const eta =
            estimate?.estimatedDaysMin != null
              ? `${estimate.estimatedDaysMin}${
                  estimate.estimatedDaysMax &&
                  estimate.estimatedDaysMax !== estimate.estimatedDaysMin
                    ? `–${estimate.estimatedDaysMax}`
                    : ''
                } business days`
              : option.eta;

          return (
            <label
              key={option.id}
              htmlFor={`shipping-${option.id}`}
              className={cn(
                'bg-card relative flex min-h-[168px] flex-col gap-4 rounded-2xl border p-5 transition-all',
                isSelected
                  ? 'border-primary ring-primary/25 shadow-[var(--shadow-soft)] ring-2'
                  : 'border-border',
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:border-foreground/40 cursor-pointer',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="bg-muted text-foreground flex size-11 items-center justify-center rounded-2xl">
                  <Truck className="size-5" aria-hidden />
                </span>
                <RadioGroupItem
                  value={option.id}
                  id={`shipping-${option.id}`}
                  className="mt-1"
                  disabled={disabled}
                />
              </div>

              <div className="min-w-0 flex-1">
                <Label htmlFor={`shipping-${option.id}`} className="text-base font-semibold">
                  {option.label}
                </Label>
                <p className="text-muted-foreground mt-1 text-sm leading-snug">
                  {option.description}
                </p>
                <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
                  <Clock3 className="size-3.5 shrink-0" aria-hidden />
                  {eta}
                </p>
              </div>

              <div className="border-border/70 mt-auto flex items-end justify-between gap-2 border-t pt-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Shipping fee
                </span>
                <span className="text-base font-semibold">{priceLabel(session, amount)}</span>
              </div>
            </label>
          );
        })}
      </RadioGroup>

      <ul className="border-border/80 bg-muted/30 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border px-4 py-3">
        {TRUST_BADGES.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm"
          >
            <Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
