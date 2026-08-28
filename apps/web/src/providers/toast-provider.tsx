import { Toaster } from 'sonner';

import type { ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

/** Premium toasts — soft pill shape, refined shadow, elegant type. */

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}

      <Toaster
        position="top-right"

        closeButton

        expand={false}

        duration={4200}

        gap={12}

        offset={{ top: 72, right: 16 }}

        toastOptions={{
          unstyled: false,

          classNames: {
            toast:
              'group toast border border-neutral-200/70 bg-white/95 text-neutral-900 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.35)] backdrop-blur-sm rounded-2xl px-5 py-4 gap-3.5 font-[Figtree,system-ui,sans-serif]',

            title: 'text-[13.5px] font-semibold tracking-[0.01em] text-neutral-900 leading-snug',

            description: 'text-[12px] text-neutral-500 leading-relaxed',

            success: 'border-neutral-200/70 bg-white/95 text-neutral-900',

            error: 'border-red-200/70 bg-white/95 text-neutral-900',

            warning: 'border-amber-200/70 bg-white/95 text-neutral-900',

            info: 'border-neutral-200/70 bg-white/95 text-neutral-900',

            actionButton:
              'bg-neutral-900 text-white text-[11px] font-semibold uppercase tracking-wider rounded-full',

            cancelButton: 'bg-neutral-100 text-neutral-700 text-[11px] rounded-full',

            closeButton:
              'border-0 bg-transparent text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 rounded-full left-auto right-3 top-3 size-7',

            icon: 'text-neutral-800',
          },
        }}
      />
    </>
  );
}
