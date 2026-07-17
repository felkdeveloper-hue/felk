import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

const fieldClassName =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400';

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
      <span className="font-medium text-neutral-700">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-600">{error.message}</span> : null}
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
        className={cn(fieldClassName, error && 'border-red-300')}
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
        className={cn(fieldClassName, 'min-h-28', error && 'border-red-300')}
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
        className={cn(fieldClassName, error && 'border-red-300')}
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
