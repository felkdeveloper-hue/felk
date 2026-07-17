import * as React from 'react';
import { cn } from '@/lib/utils';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  className,
  autoFocus,
}: OtpInputProps) {
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const chars = value.split('').slice(0, length);
    return Array.from({ length }, (_, index) => chars[index] ?? '');
  }, [value, length]);

  const setDigit = (index: number, digit: string) => {
    const next = [...digits];
    next[index] = digit;
    const nextValue = next.join('');
    onChange(nextValue);

    if (nextValue.length === length && !nextValue.includes('')) {
      onComplete?.(nextValue);
    }
  };

  const focusInput = (index: number) => {
    const target = inputRefs.current[index];
    target?.focus();
    target?.select();
  };

  const handleChange = (index: number, rawValue: string) => {
    const sanitized = rawValue.replace(/\D/g, '');
    if (!sanitized) {
      setDigit(index, '');
      return;
    }

    const chars = sanitized.split('');
    let cursor = index;

    for (const char of chars) {
      if (cursor >= length) break;
      setDigit(cursor, char);
      cursor += 1;
    }

    focusInput(Math.min(cursor, length - 1));
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    handleChange(index, pasted);
  };

  return (
    <div
      role="group"
      aria-label="One-time passcode"
      className={cn('flex items-center gap-2', className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          className={cn(
            'border-input bg-card text-foreground size-11 rounded-md border text-center text-lg font-semibold shadow-[var(--shadow-soft)] outline-none transition-[color,box-shadow,border-color]',
            'focus-visible:border-ring focus-visible:shadow-[var(--shadow-focus)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      ))}
    </div>
  );
}
