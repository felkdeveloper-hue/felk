import {
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
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

/** Select an existing CMS option, or create a new one inline. */
export function AdminCreatableSelect({
  label,
  error,
  registration,
  options,
  createLabel,
  createPlaceholder,
  onCreate,
  disabled,
  ...props
}: {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  options: Array<{ label: string; value: string }>;
  createLabel: string;
  createPlaceholder?: string;
  onCreate: (name: string) => Promise<void>;
  disabled?: boolean;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'disabled'>) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const resetCreate = () => {
    setIsCreating(false);
    setName('');
    setCreateError(null);
    setIsPending(false);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError('Name is required');
      return;
    }
    setIsPending(true);
    setCreateError(null);
    try {
      await onCreate(trimmed);
      resetCreate();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create');
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <AdminField label={label} error={error}>
        <select
          className={cn(fieldClassName, error && 'border-red-300 dark:border-red-500/50')}
          {...registration}
          {...props}
          disabled={disabled || isCreating}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </AdminField>

      {!disabled ? (
        isCreating ? (
          <div className="rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {createLabel}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCreate(e);
                  }
                  if (e.key === 'Escape') resetCreate();
                }}
                placeholder={createPlaceholder ?? 'Enter name'}
                disabled={isPending}
                autoFocus
                className={cn(
                  fieldClassName,
                  'sm:flex-1',
                  createError && 'border-red-300 dark:border-red-500/50',
                )}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => void handleCreate(e)}
                  disabled={isPending}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-medium text-[var(--admin-surface)] transition hover:opacity-90 disabled:opacity-60 sm:flex-none"
                >
                  {isPending ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetCreate}
                  disabled={isPending}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-panel)] px-3 text-sm font-medium text-[var(--admin-ink)] transition hover:bg-neutral-50 disabled:opacity-60 sm:flex-none dark:hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
            {createError ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{createError}</p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-xs font-medium text-[var(--admin-accent)] transition hover:underline"
          >
            + {createLabel}
          </button>
        )
      ) : null}
    </div>
  );
}
