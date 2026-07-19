import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils';

export interface PriceRangeSliderProps {
  min: number;
  max: number;
  valueMin?: number;
  valueMax?: number;
  step?: number;
  currency?: string;
  onChange: (min: number | undefined, max: number | undefined) => void;
  className?: string;
}

export function PriceRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  step = 100,
  currency = 'LKR',
  onChange,
  className,
}: PriceRangeSliderProps) {
  const id = useId();
  const [localMin, setLocalMin] = useState(valueMin ?? min);
  const [localMax, setLocalMax] = useState(valueMax ?? max);

  useEffect(() => {
    setLocalMin(valueMin ?? min);
    setLocalMax(valueMax ?? max);
  }, [valueMin, valueMax, min, max]);

  const span = Math.max(max - min, 1);
  const leftPct = ((localMin - min) / span) * 100;
  const rightPct = ((localMax - min) / span) * 100;

  const commit = (nextMin: number, nextMax: number) => {
    const clampedMin = Math.min(nextMin, nextMax);
    const clampedMax = Math.max(nextMin, nextMax);
    setLocalMin(clampedMin);
    setLocalMax(clampedMax);
    onChange(
      clampedMin <= min ? undefined : clampedMin,
      clampedMax >= max ? undefined : clampedMax,
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>{formatCurrency(localMin, currency)}</span>
        <span>{formatCurrency(localMax, currency)}</span>
      </div>

      <div className="relative h-8">
        <div className="bg-muted absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full" />
        <div
          className="bg-foreground absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${leftPct}%`, width: `${Math.max(rightPct - leftPct, 0)}%` }}
        />

        <label className="sr-only" htmlFor={`${id}-min`}>
          Minimum price
        </label>
        <input
          id={`${id}-min`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMin}
          onChange={(event) => {
            const next = Number(event.target.value);
            const capped = Math.min(next, localMax);
            setLocalMin(capped);
          }}
          onMouseUp={() => commit(localMin, localMax)}
          onTouchEnd={() => commit(localMin, localMax)}
          onKeyUp={() => commit(localMin, localMax)}
          className="[&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:bg-foreground pointer-events-none absolute inset-0 z-20 m-0 h-8 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-30 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
        />

        <label className="sr-only" htmlFor={`${id}-max`}>
          Maximum price
        </label>
        <input
          id={`${id}-max`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={localMax}
          onChange={(event) => {
            const next = Number(event.target.value);
            const capped = Math.max(next, localMin);
            setLocalMax(capped);
          }}
          onMouseUp={() => commit(localMin, localMax)}
          onTouchEnd={() => commit(localMin, localMax)}
          onKeyUp={() => commit(localMin, localMax)}
          className="[&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:bg-foreground pointer-events-none absolute inset-0 z-30 m-0 h-8 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-40 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>
    </div>
  );
}
