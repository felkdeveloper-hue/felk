import { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatCountdown, isExpired, msUntilExpiry } from '@/utils/checkout';
import type { CheckoutSession } from '@/services/sdk';

export interface CheckoutExpiryBannerProps {
  session: CheckoutSession;
  onExtend?: () => void;
  onRestart?: () => void;
  isExtending?: boolean;
}

export function CheckoutExpiryBanner({
  session,
  onExtend,
  onRestart,
  isExtending,
}: CheckoutExpiryBannerProps) {
  const reservationExpired = isExpired(session.reservationExpiresAt);
  const sessionExpired = session.status === 'expired' || isExpired(session.expiresAt);
  const [reservationRemaining, setReservationRemaining] = useState(() =>
    msUntilExpiry(session.reservationExpiresAt),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setReservationRemaining(msUntilExpiry(session.reservationExpiresAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session.reservationExpiresAt]);

  if (sessionExpired) {
    return (
      <Alert variant="destructive" role="alert" className="mb-6">
        <AlertTriangle aria-hidden />
        <AlertTitle>Checkout session expired</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>
            Your checkout session has expired. Start again to reserve inventory and complete your
            order.
          </p>
          {onRestart ? (
            <Button type="button" size="sm" className="w-fit" onClick={onRestart}>
              Restart checkout
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (reservationExpired) {
    return (
      <Alert variant="destructive" role="alert" className="mb-6">
        <AlertTriangle aria-hidden />
        <AlertTitle>Inventory reservation expired</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>
            Items are no longer reserved. Refresh checkout to re-reserve before placing your order.
          </p>
          {onExtend ? (
            <Button
              type="button"
              size="sm"
              className="w-fit"
              onClick={onExtend}
              disabled={isExtending}
            >
              Re-reserve items
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (reservationRemaining !== null && reservationRemaining <= 5 * 60 * 1000) {
    return (
      <Alert className="mb-6 border-amber-500/50 bg-amber-500/5" role="status">
        <Clock className="text-amber-600" aria-hidden />
        <AlertTitle>Reservation expiring soon</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Your items are reserved for <strong>{formatCountdown(reservationRemaining)}</strong>.
            Complete checkout before time runs out.
          </p>
          {onExtend ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExtend}
              disabled={isExtending}
            >
              Extend reservation
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
