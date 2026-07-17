import { Link } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, RefreshCw, Truck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { useRecentOrdersQuery } from '@/hooks/orders';

export function OrderNotificationBanners() {
  const { data } = useRecentOrdersQuery(5);
  const orders = data?.data ?? [];

  const shipped = orders.find((order) => order.status === 'shipped');
  const refundProcessed = orders.find((order) => order.status === 'refunded');
  const returnApproved = orders.find(
    (order) => order.status === 'returned' || order.status === 'refund_pending',
  );
  const paymentIssue = orders.find((order) => order.status === 'cancelled');

  const banners = [
    shipped
      ? {
          key: `shipped-${shipped.id}`,
          icon: Truck,
          title: 'Your order has shipped',
          description: `Order ${shipped.orderNumber} is on its way.`,
          link: (
            <Link to="/account/orders/$orderId" params={{ orderId: shipped.id }}>
              View details
            </Link>
          ),
        }
      : null,
    refundProcessed
      ? {
          key: `refund-${refundProcessed.id}`,
          icon: RefreshCw,
          title: 'Refund processed',
          description: `Your refund for order ${refundProcessed.orderNumber} has been completed.`,
          link: (
            <Link to="/account/orders/$orderId" params={{ orderId: refundProcessed.id }}>
              View details
            </Link>
          ),
        }
      : null,
    returnApproved
      ? {
          key: `return-${returnApproved.id}`,
          icon: CheckCircle2,
          title: 'Return update',
          description: `Return activity on order ${returnApproved.orderNumber}.`,
          link: <Link to={ROUTES.accountReturns}>View details</Link>,
        }
      : null,
    paymentIssue
      ? {
          key: `payment-${paymentIssue.id}`,
          icon: AlertCircle,
          title: 'Order cancelled',
          description: `Order ${paymentIssue.orderNumber} was cancelled.`,
          link: (
            <Link to="/account/orders/$orderId" params={{ orderId: paymentIssue.id }}>
              View details
            </Link>
          ),
        }
      : null,
  ].filter(Boolean);

  if (!banners.length) return null;

  return (
    <div className="mb-6 space-y-3" aria-live="polite">
      {banners.map((banner) => {
        const Icon = banner!.icon;
        return (
          <Alert key={banner!.key}>
            <Icon aria-hidden />
            <AlertTitle>{banner!.title}</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{banner!.description}</span>
              <Button asChild variant="outline" size="sm" className="w-fit">
                {banner!.link}
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
