import { BadgeCheck, Lock, ShieldCheck } from 'lucide-react';
import { PAYMENT_METHOD_OPTIONS } from '@/constants/checkout.constants';
import type { PaymentMethod } from '@/services/sdk';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const TRUST_BADGES = [
  { icon: Lock, label: 'SSL encrypted' },
  { icon: ShieldCheck, label: 'Secure checkout' },
  { icon: BadgeCheck, label: 'Verified gateways' },
] as const;

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <legend className="sr-only">Payment method</legend>

      <RadioGroup
        value={value ?? undefined}
        onValueChange={(next) => onChange(next as PaymentMethod)}
        className="grid gap-3 sm:grid-cols-2"
      >
        {PAYMENT_METHOD_OPTIONS.map((option) => {
          const isSelected = value === option.id;

          return (
            <label
              key={option.id}
              htmlFor={`payment-${option.id}`}
              className={cn(
                'bg-card relative flex min-h-[132px] cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-all',
                'hover:border-foreground/40',
                isSelected
                  ? 'border-primary ring-primary/25 shadow-[var(--shadow-soft)] ring-2'
                  : 'border-border',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="bg-background border-border/70 flex h-12 w-[148px] items-center justify-center rounded-xl border px-2"
                  style={{ boxShadow: `inset 0 0 0 1px ${option.accent}22` }}
                >
                  <img
                    src={option.logoSrc}
                    alt=""
                    width={140}
                    height={36}
                    className="h-9 w-auto max-w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <RadioGroupItem
                  value={option.id}
                  id={`payment-${option.id}`}
                  className="mt-1"
                  disabled={disabled}
                />
              </div>

              <div className="min-w-0 flex-1">
                <Label htmlFor={`payment-${option.id}`} className="text-base font-semibold">
                  {option.label}
                </Label>
                <p className="text-muted-foreground mt-1 text-sm leading-snug">
                  {option.description}
                </p>
              </div>

              <span
                className="mt-auto inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  color: option.accent,
                  backgroundColor: `${option.accent}18`,
                }}
              >
                Trusted partner
              </span>
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
            <Icon className="size-4 shrink-0 text-emerald-500" aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Your payment is processed by licensed Sri Lankan payment partners. Card details are never
        stored on FE servers.
      </p>
    </fieldset>
  );
}
