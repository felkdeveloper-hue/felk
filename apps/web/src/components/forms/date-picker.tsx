import * as React from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(month: Date): Date[] {
  const firstOfMonth = startOfMonth(month);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function Calendar({
  selected,
  onSelect,
  month,
  onMonthChange,
  disabled,
  className,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(() =>
    startOfMonth(selected ?? new Date()),
  );
  const visibleMonth = month ?? internalMonth;
  const today = React.useMemo(() => new Date(), []);

  const changeMonth = (next: Date) => {
    setInternalMonth(next);
    onMonthChange?.(next);
  };

  const days = React.useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = React.useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(visibleMonth),
    [visibleMonth],
  );

  return (
    <div className={cn('w-72', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(addMonths(visibleMonth, -1))}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-foreground text-sm font-medium">{monthLabel}</p>
        <button
          type="button"
          onClick={() => changeMonth(addMonths(visibleMonth, 1))}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-muted-foreground text-[11px] font-medium">
            {label}
          </span>
        ))}

        {days.map((day) => {
          const isOutside = day.getMonth() !== visibleMonth.getMonth();
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, today);
          const isDisabled = disabled?.(day) ?? false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(day)}
              className={cn(
                'mx-auto flex size-8 items-center justify-center rounded-md text-sm transition-colors',
                isOutside && 'text-muted-foreground/40',
                !isOutside && !isSelected && 'text-foreground hover:bg-muted',
                isToday && !isSelected && 'text-primary font-semibold',
                isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const label = value
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(value)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start gap-2 font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          selected={value}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
