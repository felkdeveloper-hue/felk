import { Toaster } from 'sonner';

import type { ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

/** Premium toasts — compact on mobile, refined on desktop. */

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}

      <Toaster
        position="top-center"
        closeButton
        expand={false}
        duration={3200}
        gap={8}
        offset={{ top: 12, right: 12, left: 12 }}
        mobileOffset={{ top: 10, left: 10, right: 10 }}
        toastOptions={{
          unstyled: false,
          classNames: {
            toast:
              'group toast !w-auto !max-w-[min(100%,20rem)] sm:!max-w-sm border border-neutral-200/80 bg-white text-neutral-900 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.28)] rounded-xl px-3.5 py-2.5 gap-2.5 font-[Figtree,system-ui,sans-serif] sm:rounded-2xl sm:px-5 sm:py-3.5 sm:gap-3.5',
            title:
              'text-[12px] font-medium tracking-[0.01em] text-neutral-800 leading-snug sm:text-[13.5px] sm:font-semibold sm:text-neutral-900',
            description: 'text-[11px] text-neutral-500 leading-relaxed sm:text-[12px]',
            success: 'border-neutral-200/80 bg-white text-neutral-900',
            error: 'border-red-200/80 bg-white text-neutral-900',
            warning: 'border-amber-200/80 bg-white text-neutral-900',
            info: 'border-neutral-200/80 bg-white text-neutral-900',
            actionButton:
              'bg-neutral-900 text-white text-[10px] font-semibold uppercase tracking-wider rounded-full sm:text-[11px]',
            cancelButton: 'bg-neutral-100 text-neutral-700 text-[10px] rounded-full sm:text-[11px]',
            closeButton:
              'border-0 bg-transparent text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 rounded-full !left-auto !right-2 !top-2 size-6 sm:size-7 sm:!right-3 sm:!top-3',
            icon: 'text-neutral-800 !size-4 sm:!size-5 [&_svg]:size-3.5 sm:[&_svg]:size-4',
          },
        }}
      />
    </>
  );
}
