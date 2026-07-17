import { Download, Printer } from 'lucide-react';
import type { OrderInvoice } from '@/services/sdk';
import { formatCurrency, formatDate } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export interface InvoiceViewProps {
  invoice: OrderInvoice;
}

export function InvoiceView({ invoice }: InvoiceViewProps) {
  const handlePrint = () => window.print();
  const pdfAvailable = invoice.pdf.status === 'ready' && invoice.pdf.url;

  return (
    <article className="border-border bg-card rounded-xl border p-6 print:border-none print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Invoice</p>
          <h1 className="text-2xl font-semibold">{invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Order {invoice.orderNumber}
            {invoice.issuedAt ? ` · ${formatDate(invoice.issuedAt)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {pdfAvailable ? (
            <Button asChild variant="outline">
              <a href={invoice.pdf.url!} target="_blank" rel="noopener noreferrer">
                <Download className="size-4" aria-hidden />
                Download PDF
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="size-4" aria-hidden />
            {pdfAvailable ? 'Print' : 'Print invoice'}
          </Button>
        </div>
      </header>

      {!pdfAvailable && invoice.pdf.message ? (
        <p className="text-muted-foreground mt-4 text-sm print:hidden">{invoice.pdf.message}</p>
      ) : null}

      <Separator className="my-6" />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium">Bill to</h2>
          {invoice.billingAddress ? (
            <address className="text-muted-foreground mt-2 text-sm not-italic">
              {invoice.billingAddress.fullName}
              <br />
              {invoice.billingAddress.line1}
              <br />
              {invoice.billingAddress.city} {invoice.billingAddress.postalCode}
            </address>
          ) : null}
        </div>
        <div>
          <h2 className="text-sm font-medium">Payment</h2>
          <p className="text-muted-foreground mt-2 text-sm capitalize">
            {invoice.paymentMethod} · {invoice.paymentReference}
          </p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={`${item.sku}-${item.name}`} className="border-border/60 border-b">
              <td className="py-3">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">SKU {item.sku}</p>
              </td>
              <td className="py-3">{item.quantity}</td>
              <td className="py-3 text-right">
                {formatCurrency(item.lineTotal, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(invoice.totals.subtotal, invoice.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span>{formatCurrency(invoice.totals.shipping, invoice.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(invoice.totals.tax, invoice.currency)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(invoice.totals.grandTotal, invoice.currency)}</span>
        </div>
      </div>
    </article>
  );
}
