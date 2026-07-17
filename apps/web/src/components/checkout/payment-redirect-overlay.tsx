import { motion } from 'framer-motion';
import { Loader2, Shield } from 'lucide-react';

export interface PaymentRedirectOverlayProps {
  open: boolean;
  message?: string;
}

export function PaymentRedirectOverlay({
  open,
  message = 'Redirecting to secure payment…',
}: PaymentRedirectOverlayProps) {
  if (!open) return null;

  return (
    <motion.div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <motion.div
        className="border-border bg-card mx-4 flex max-w-sm flex-col items-center gap-4 rounded-xl border p-8 text-center shadow-lg"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <div className="relative">
          <Shield className="text-primary size-10" aria-hidden />
          <Loader2
            className="text-muted-foreground absolute -bottom-1 -right-1 size-5 animate-spin"
            aria-hidden
          />
        </div>
        <p className="text-sm font-medium">{message}</p>
        <p className="text-muted-foreground text-xs">Please do not close this window.</p>
      </motion.div>
    </motion.div>
  );
}
