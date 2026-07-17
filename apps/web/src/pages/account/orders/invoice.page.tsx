import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Seo } from '@/components/common/seo';
import { InvoiceView } from '@/components/orders';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderInvoiceQuery } from '@/hooks/orders';

export function AccountOrderInvoicePage() {
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const invoiceQuery = useOrderInvoiceQuery(orderId);

  return (
    <>
      <Seo title="Invoice" description="View and download your invoice." noIndex />

      <div className="mb-6 print:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/account/orders/$orderId" params={{ orderId: orderId }}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to order
          </Link>
        </Button>
      </div>

      {invoiceQuery.isLoading ? <Skeleton className="h-96 w-full" aria-busy="true" /> : null}
      {invoiceQuery.error ? (
        <AuthErrorAlert error={invoiceQuery.error} onRetry={() => invoiceQuery.refetch()} />
      ) : null}
      {invoiceQuery.data ? <InvoiceView invoice={invoiceQuery.data} /> : null}
    </>
  );
}
