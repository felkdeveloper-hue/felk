import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton expand={false} />
    </>
  );
}
