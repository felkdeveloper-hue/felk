import { PAYMENT_METHOD_OPTIONS } from '@/constants/checkout.constants';
import type { PaymentMethod } from '@/services/sdk';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-base font-medium">Payment method</legend>
      <RadioGroup
        value={value ?? undefined}
        onValueChange={(next) => onChange(next as PaymentMethod)}
        className="space-y-3"
      >
        {PAYMENT_METHOD_OPTIONS.map((option) => {
          const isSelected = value === option.id;

          return (
            <label
              key={option.id}
              htmlFor={`payment-${option.id}`}
              className={cn(
                'flex gap-3 rounded-lg border p-4 transition-colors',
                option.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                isSelected && option.enabled
                  ? 'border-primary ring-primary/30 ring-1'
                  : 'border-border',
              )}
            >
              <RadioGroupItem
                value={option.id}
                id={`payment-${option.id}`}
                className="mt-1"
                disabled={!option.enabled || disabled}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`payment-${option.id}`} className="font-medium">
                    {option.label}
                  </Label>
                  {option.comingSoon ? <Badge variant="outline">Coming soon</Badge> : null}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{option.description}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
