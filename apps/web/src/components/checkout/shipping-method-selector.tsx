import { SHIPPING_METHOD_OPTIONS } from '@/constants/checkout.constants';
import { formatCurrency } from '@/utils/format';
import type { CheckoutSession, ShippingMethod } from '@/services/sdk';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface ShippingMethodSelectorProps {
  session: CheckoutSession;
  value: ShippingMethod;
  onChange: (method: ShippingMethod) => void;
  disabled?: boolean;
}

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

export function ShippingMethodSelector({
  session,
  value,
  onChange,
  disabled,
}: ShippingMethodSelectorProps) {
  const { currency } = session;

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-base font-medium">Shipping method</legend>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as ShippingMethod)}
        className="space-y-3"
      >
        {SHIPPING_METHOD_OPTIONS.map((option) => {
          const estimate = estimateForMethod(session, option.id);
          const amount = estimate?.amount;
          const isSelected = value === option.id;

          return (
            <label
              key={option.id}
              htmlFor={`shipping-${option.id}`}
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
                isSelected ? 'border-primary ring-primary/30 ring-1' : 'border-border',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <RadioGroupItem value={option.id} id={`shipping-${option.id}`} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`shipping-${option.id}`} className="font-medium">
                    {option.label}
                  </Label>
                  {option.id === 'free' ? <Badge variant="secondary">Free</Badge> : null}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{option.description}</p>
                {estimate?.estimatedDaysMin != null ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Estimated delivery: {estimate.estimatedDaysMin}
                    {estimate.estimatedDaysMax &&
                    estimate.estimatedDaysMax !== estimate.estimatedDaysMin
                      ? `–${estimate.estimatedDaysMax}`
                      : ''}{' '}
                    business days
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-sm font-medium">
                {option.id === 'free' || amount === 0
                  ? 'Free'
                  : amount != null
                    ? formatCurrency(amount, currency)
                    : isSelected
                      ? formatCurrency(session.totals.shipping, currency)
                      : '—'}
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
