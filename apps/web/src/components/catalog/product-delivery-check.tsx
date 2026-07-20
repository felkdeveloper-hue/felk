import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ProductDeliveryCheck() {
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

  return (
    <section aria-labelledby="delivery-check" className="space-y-3">
      <h2 id="delivery-check" className="text-sm font-semibold">
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
          className="pr-20"
          maxLength={6}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCheck}
          className="absolute right-1 top-1/2 -translate-y-1/2 font-semibold text-teal-600 hover:text-teal-700"
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
          'flex items-center gap-2.5 rounded-lg bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950',
        )}
      >
        <Truck className="size-5 shrink-0 text-sky-600" />
        This product is eligible for FREE SHIPPING
      </div>
    </section>
  );
}
