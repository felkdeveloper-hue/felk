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
  /** Mobile checkout step 2 — logos + radios only, no trust chrome. */
  compact?: boolean;
}

const TRUST_BADGES = [
  { icon: Lock, label: 'SSL encrypted' },
  { icon: ShieldCheck, label: 'Secure checkout' },
  { icon: BadgeCheck, label: 'Verified gateways' },
] as const;

export function PaymentMethodSelector({
  value,
  onChange,
  disabled,
  compact = false,
}: PaymentMethodSelectorProps) {
  return (
    <fieldset className={cn(compact ? 'space-y-3' : 'space-y-4 sm:space-y-5')} disabled={disabled}>
      <legend className="sr-only">Payment method</legend>

      <RadioGroup
        value={value ?? undefined}
        onValueChange={(next) => onChange(next as PaymentMethod)}
        className={cn(
          'grid gap-2.5',
          compact ? 'grid-cols-1' : 'sm:grid-cols-2 sm:gap-3 lg:grid-cols-3',
        )}
      >
        {PAYMENT_METHOD_OPTIONS.filter((option) => option.enabled).map((option) => {
          const isSelected = value === option.id;

          return (
            <label
              key={option.id}
              htmlFor={`payment-${option.id}`}
              className={cn(
                'bg-card relative flex cursor-pointer flex-col rounded-xl border transition-all',
                compact
                  ? 'min-h-0 flex-row items-center gap-3 p-3'
                  : 'min-h-[108px] gap-2.5 p-3 sm:min-h-[132px] sm:gap-3 sm:rounded-2xl sm:p-4',
                'hover:border-foreground/40',
                isSelected
                  ? 'border-primary ring-primary/25 shadow-[var(--shadow-soft)] ring-2'
                  : 'border-border',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-between gap-3',
                  compact ? 'min-w-0 flex-1' : 'w-full items-start',
                )}
              >
                <div
                  className={cn(
                    'bg-background border-border/70 flex items-center justify-center border px-2',
                    compact
                      ? 'h-9 w-[112px] rounded-lg'
                      : 'h-10 w-[120px] rounded-lg sm:h-12 sm:w-[148px] sm:rounded-xl',
                  )}
                  style={{ boxShadow: `inset 0 0 0 1px ${option.accent}22` }}
                >
                  <img
                    src={option.logoSrc}
                    alt={`${option.label} logo`}
                    width={140}
                    height={36}
                    className={cn(
                      'w-auto max-w-full object-contain',
                      compact ? 'h-6' : 'h-7 sm:h-9',
                    )}
                    decoding="async"
                    fetchPriority="high"
                  />
                </div>
                {compact ? (
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`payment-${option.id}`}
                      className="text-sm font-semibold leading-tight"
                    >
                      {option.label}
                    </Label>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      {option.description}
                    </p>
                  </div>
                ) : null}
                <RadioGroupItem
                  value={option.id}
                  id={`payment-${option.id}`}
                  className={compact ? 'shrink-0' : 'mt-1'}
                  disabled={disabled}
                />
              </div>

              {!compact ? (
                <>
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor={`payment-${option.id}`}
                      className="text-sm font-semibold sm:text-base"
                    >
                      {option.label}
                    </Label>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-snug sm:mt-1 sm:text-sm">
                      {option.description}
                    </p>
                  </div>

                  <span
                    className="mt-auto inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]"
                    style={{
                      color: option.accent,
                      backgroundColor: `${option.accent}18`,
                    }}
                  >
                    Trusted partner
                  </span>
                </>
              ) : null}
            </label>
          );
        })}
      </RadioGroup>

      {!compact ? (
        <>
          <ul className="border-border/80 bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2.5 sm:gap-x-5 sm:rounded-2xl sm:px-4 sm:py-3">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="text-muted-foreground flex items-center gap-1.5 text-[11px] sm:gap-2 sm:text-sm"
              >
                <Icon className="size-3.5 shrink-0 text-emerald-500 sm:size-4" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground text-[11px] leading-relaxed sm:text-xs">
            Your payment is processed by licensed Sri Lankan payment partners. Card details are
            never stored on FE servers.
          </p>
        </>
      ) : null}
    </fieldset>
  );
}
