import { Link, useSearch } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { usePaymentStatusQuery } from '@/hooks/payment';
import { useCheckoutStore } from '@/store';

export function CheckoutSuccessPage() {
  const search = useSearch({ strict: false }) as { checkoutToken?: string };
  const storedToken = useCheckoutStore((state) => state.checkoutToken);
  const checkoutToken = search.checkoutToken ?? storedToken ?? null;

  const statusQuery = usePaymentStatusQuery(checkoutToken, { poll: true });
  const status = statusQuery.data?.status;
  const isPending = status === 'pending' || status === 'processing' || statusQuery.isLoading;
  const isPaid = status === 'paid' || status === 'authorized';
  const isCodProcessing = status === 'processing';

  return (
    <>
      <Seo title="Order confirmed" description="Your payment was successful." noIndex />

      <div className="mx-auto max-w-lg py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex flex-col items-center"
        >
          {isPending && !isPaid ? (
            <Loader2 className="text-primary size-16 animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 className="size-16 text-emerald-600" aria-hidden />
          )}

          <h1 className="mt-6 text-2xl font-semibold">
            {isPaid
              ? 'Payment successful'
              : isCodProcessing
                ? 'Order placed'
                : 'Processing payment'}
          </h1>

          <p className="text-muted-foreground mt-3 text-sm" role="status" aria-live="polite">
            {isPaid
              ? 'Thank you! Your payment was received and your order is being processed.'
              : isCodProcessing
                ? 'Your cash-on-delivery order is confirmed. Pay when your order arrives.'
                : 'We are confirming your payment. This may take a moment…'}
          </p>

          {checkoutToken ? (
            <p className="text-muted-foreground mt-4 text-xs">
              Reference: <span className="font-mono">{checkoutToken.slice(0, 12)}…</span>
            </p>
          ) : null}
        </motion.div>

        {statusQuery.error ? (
          <div className="mt-8 text-left">
            <AuthErrorAlert error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to={ROUTES.products}>Continue shopping</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={ROUTES.account}>Go to account</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
