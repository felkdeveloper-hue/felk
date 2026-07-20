import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

const fieldClassName =
  'w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-3 py-2 text-sm text-[var(--admin-ink)] outline-none transition-colors focus:border-[var(--admin-accent)]/50';

export function AdminField({
  label,
  error,
  children,
}: {
  label: string;
  error?: FieldError;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-600 dark:text-red-400">{error.message}</span>
      ) : null}
    </label>
  );
}

export function AdminTextInput({
  label,
  error,
  registration,
  ...props
}: {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <AdminField label={label} error={error}>
      <input
        className={cn(fieldClassName, error && 'border-red-300 dark:border-red-500/50')}
        {...registration}
        {...props}
      />
    </AdminField>
  );
}

export function AdminTextarea({
  label,
  error,
  registration,
  ...props
}: {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <AdminField label={label} error={error}>
      <textarea
        className={cn(fieldClassName, 'min-h-28', error && 'border-red-300 dark:border-red-500/50')}
        {...registration}
        {...props}
      />
    </AdminField>
  );
}

export function AdminSelect({
  label,
  error,
  registration,
  options,
  ...props
}: {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  options: Array<{ label: string; value: string }>;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <AdminField label={label} error={error}>
      <select
        className={cn(fieldClassName, error && 'border-red-300 dark:border-red-500/50')}
        {...registration}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </AdminField>
  );
}
