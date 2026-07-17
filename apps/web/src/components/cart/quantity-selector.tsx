import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  label?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
  loading,
  className,
  label = 'Quantity',
}: QuantitySelectorProps) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="sr-only">{label}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9"
        onClick={decrease}
        disabled={disabled || loading || value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" />
      </Button>
      <motion.div
        key={value}
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled || loading}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            onChange(Math.min(max, Math.max(min, next)));
          }}
          className="h-9 w-14 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={label}
        />
      </motion.div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-9"
        onClick={increase}
        disabled={disabled || loading || value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
