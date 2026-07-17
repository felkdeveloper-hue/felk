import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { XCircle } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useRetryPaymentMutation } from '@/hooks/payment';
import { useCheckoutStore } from '@/store';

export function CheckoutCancelPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { checkoutToken?: string };
  const storedToken = useCheckoutStore((state) => state.checkoutToken);
  const paymentMethod = useCheckoutStore((state) => state.selectedPaymentMethod);
  const checkoutToken = search.checkoutToken ?? storedToken ?? null;

  const retryPayment = useRetryPaymentMutation();

  const handleRetry = () => {
    if (!checkoutToken || !paymentMethod) {
      void navigate({ to: ROUTES.checkoutReview });
      return;
    }

    retryPayment.mutate(
      { checkoutToken, method: paymentMethod },
      {
        onSuccess: (payment) => {
          if (payment.redirectUrl) {
            window.location.assign(payment.redirectUrl);
            return;
          }
          void navigate({
            to: ROUTES.checkoutSuccess,
            search: { checkoutToken },
          });
        },
      },
    );
  };

  return (
    <>
      <Seo title="Payment cancelled" description="Your payment was cancelled." noIndex />

      <div className="mx-auto max-w-lg py-12 text-center">
        <XCircle className="text-destructive mx-auto size-16" aria-hidden />
        <h1 className="mt-6 text-2xl font-semibold">Payment cancelled</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Your payment was not completed. You can retry payment or return to your cart.
        </p>

        {retryPayment.error ? (
          <div className="mt-6 text-left">
            <AuthErrorAlert error={retryPayment.error} onRetry={handleRetry} />
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleRetry} disabled={retryPayment.isPending}>
            Retry payment
          </Button>
          <Button variant="outline" asChild>
            <Link to={ROUTES.checkoutReview}>Back to review</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={ROUTES.cart}>Return to cart</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
