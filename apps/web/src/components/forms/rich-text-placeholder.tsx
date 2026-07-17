import * as React from 'react';
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

export interface RichTextPlaceholderProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minRows?: number;
}

const TOOLBAR_ICONS = [Bold, Italic, Underline, List, ListOrdered];

/**
 * Stand-in for a full rich text editor. Renders a familiar toolbar plus a
 * plain-text area so forms can be wired up today; swap the body for a real
 * editor (e.g. Tiptap/Lexical) later without changing the field contract.
 */
export function RichTextPlaceholder({
  value,
  onChange,
  placeholder = 'Start writing…',
  disabled,
  className,
  minRows = 6,
}: RichTextPlaceholderProps) {
  return (
    <div
      className={cn(
        'border-input bg-card overflow-hidden rounded-md border shadow-[var(--shadow-soft)]',
        className,
      )}
    >
      <div className="border-border flex items-center gap-1 border-b px-2 py-1.5">
        {TOOLBAR_ICONS.map((Icon, index) => (
          <button
            key={index}
            type="button"
            disabled
            title="Rich formatting coming soon"
            className="text-muted-foreground/60 flex size-7 items-center justify-center rounded-md disabled:cursor-not-allowed"
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        className="rounded-none border-0 shadow-none focus-visible:shadow-none"
      />
    </div>
  );
}
