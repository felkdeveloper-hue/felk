import { useState } from 'react';
import { Banknote, CreditCard, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductPaymentOption } from './product-trust-badges';

export function ProductDeliveryCheck({
  paymentOption = 'both',
}: {
  paymentOption?: ProductPaymentOption;
}) {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const handleCheck = () => {
    const trimmed = pincode.trim();
    if (trimmed.length >= 5 && /^\d+$/.test(trimmed)) {
      setResult('valid');
    } else {
      setResult('invalid');
    }
  };

  // Site-wide prepaid only — never show COD as available.
  const codAvailable = false;
  void paymentOption;

  return (
    <section aria-labelledby="delivery-check" className="space-y-3.5 lg:space-y-3">
      <h2
        id="delivery-check"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] lg:text-sm lg:normal-case lg:tracking-normal"
      >
        Check for Delivery Details
      </h2>
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          placeholder="Enter Pincode"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value);
            setResult('idle');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          className="h-12 rounded-none pr-20 text-base lg:h-10 lg:rounded-md lg:text-sm"
          maxLength={6}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCheck}
          className="absolute right-1 top-1/2 h-10 -translate-y-1/2 font-semibold tracking-wide text-teal-600 hover:text-teal-700"
        >
          Check
        </Button>
      </div>

      {result === 'valid' ? (
        <p className="text-muted-foreground text-sm">
          Delivery by <span className="text-foreground font-medium">3–5 business days</span> to
          pincode {pincode.trim()}.
        </p>
      ) : null}

      {result === 'invalid' ? (
        <p className="text-destructive text-sm">Please enter a valid pincode.</p>
      ) : null}

      <div
        className={cn(
          'flex items-center gap-2.5 px-0 py-1 text-[13px] font-medium lg:rounded-lg lg:bg-sky-50 lg:px-4 lg:py-3 lg:text-sm lg:text-sky-950 dark:lg:bg-sky-950/40 dark:lg:text-sky-100',
        )}
      >
        <Truck className="text-muted-foreground size-4 shrink-0 lg:size-5 lg:text-sky-600 dark:lg:text-sky-300" />
        Flat shipping LKR 500 island-wide
      </div>

      <div
        className={cn(
          'flex items-center gap-2.5 px-0 py-1 text-[13px] font-medium lg:rounded-lg lg:px-4 lg:py-3 lg:text-sm',
          codAvailable
            ? 'lg:bg-emerald-50 lg:text-emerald-950 dark:lg:bg-emerald-950/40 dark:lg:text-emerald-100'
            : 'lg:bg-amber-50 lg:text-amber-950 dark:lg:bg-amber-950/40 dark:lg:text-amber-100',
        )}
      >
        {codAvailable ? (
          <Banknote className="text-muted-foreground size-4 shrink-0 lg:size-5 lg:text-emerald-600 dark:lg:text-emerald-300" />
        ) : (
          <CreditCard className="text-muted-foreground size-4 shrink-0 lg:size-5 lg:text-amber-600 dark:lg:text-amber-300" />
        )}
        {codAvailable
          ? paymentOption === 'cod'
            ? 'Cash on Delivery (COD) available'
            : 'COD & prepaid payment both available'
          : 'Prepaid payment only — pay online at checkout'}
      </div>
    </section>
  );
}
