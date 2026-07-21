import { Link, useSearch } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { usePaymentStatusQuery } from '@/hooks/payment';
import { cartApi } from '@/services/sdk';
import { useCartStore, useCheckoutStore } from '@/store';
import { clearCheckoutPlacedFlag, readCheckoutPlacedFlag } from '@/utils/checkout-placed-flag';

export function CheckoutSuccessPage() {
  const search = useSearch({ strict: false }) as { checkoutToken?: string };
  const queryClient = useQueryClient();
  const storedToken = useCheckoutStore((state) => state.checkoutToken);
  const resetCheckoutUi = useCheckoutStore((state) => state.resetCheckoutUi);
  const checkoutToken = search.checkoutToken ?? storedToken ?? null;

  const justPlaced = useMemo(() => readCheckoutPlacedFlag(checkoutToken), [checkoutToken]);

  const statusQuery = usePaymentStatusQuery(checkoutToken, { poll: true });

  const status = statusQuery.data?.status;
  const method = statusQuery.data?.method ?? '';
  const orderNumber = statusQuery.data?.orderNumber;
  const isCod = method === 'cod';

  const isOnlinePaid = status === 'paid' || status === 'authorized';
  const isConfirmed = Boolean(statusQuery.isSuccess && (orderNumber || (!isCod && isOnlinePaid)));

  const isWaiting =
    Boolean(checkoutToken) &&
    !isConfirmed &&
    !statusQuery.isError &&
    (statusQuery.isLoading || statusQuery.isFetching || justPlaced);

  const isUnconfirmed =
    !isConfirmed &&
    !isWaiting &&
    (statusQuery.isError || (statusQuery.isSuccess && isCod && !orderNumber));

  useEffect(() => {
    if (!isConfirmed || !checkoutToken) return;

    clearCheckoutPlacedFlag(checkoutToken);

    void (async () => {
      try {
        const cart = await cartApi.clear();
        useCartStore.getState().setCart(cart);
      } catch {
        useCartStore.getState().clearCart();
      }
      resetCheckoutUi();
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    })();
  }, [isConfirmed, checkoutToken, resetCheckoutUi, queryClient]);

  return (
    <>
      <Seo
        title={isConfirmed ? 'Order confirmed' : 'Confirming order'}
        description="Your order confirmation page."
        noIndex
      />

      <div className="mx-auto max-w-lg py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex flex-col items-center"
        >
          {isWaiting ? (
            <Loader2 className="text-primary size-16 animate-spin" aria-hidden />
          ) : isConfirmed ? (
            <CheckCircle2 className="size-16 text-emerald-600" aria-hidden />
          ) : (
            <AlertCircle className="text-destructive size-16" aria-hidden />
          )}

          <h1 className="mt-6 text-2xl font-semibold">
            {isConfirmed
              ? isCod
                ? 'Order placed'
                : 'Payment successful'
              : isWaiting
                ? 'Confirming your order'
                : 'Order not confirmed'}
          </h1>

          <p className="text-muted-foreground mt-3 text-sm" role="status" aria-live="polite">
            {isConfirmed
              ? isCod
                ? 'Your cash-on-delivery order is confirmed. Pay when your order arrives.'
                : 'Thank you! Your payment was received and your order is being processed.'
              : isWaiting
                ? 'Hang tight — we are creating your order now.'
                : 'We could not confirm this order. Your cart was not cleared. Please try placing the order again.'}
          </p>

          {orderNumber ? (
            <p className="text-muted-foreground mt-4 text-xs">
              Order number: <span className="text-foreground font-medium">{orderNumber}</span>
            </p>
          ) : checkoutToken ? (
            <p className="text-muted-foreground mt-4 text-xs">
              Reference: <span className="font-mono">{checkoutToken.slice(0, 12)}…</span>
            </p>
          ) : null}
        </motion.div>

        {statusQuery.error && !isWaiting ? (
          <div className="mt-8 text-left">
            <AuthErrorAlert error={statusQuery.error} onRetry={() => statusQuery.refetch()} />
          </div>
        ) : null}

        {isUnconfirmed && !statusQuery.error ? (
          <Alert variant="destructive" className="mt-8 text-left" role="alert">
            <AlertDescription>
              Payment was recorded but the order could not be created. Go back to review and place
              the order again, or contact support with your reference above.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isUnconfirmed ? (
            <Button asChild>
              <Link to={ROUTES.checkoutReview}>Back to review</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={ROUTES.products}>Continue shopping</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={ROUTES.accountOrders}>View my orders</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
