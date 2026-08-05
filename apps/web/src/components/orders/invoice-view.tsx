import type { ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import type { OrderInvoice } from '@/services/sdk';
import { formatCurrency, formatDate } from '@/utils/format';
import { printInvoiceDocument } from '@/utils/orders/print-invoice';
import { Button } from '@/components/ui/button';

export interface InvoiceViewProps {
  invoice: OrderInvoice;
  /** Extra actions shown next to download/print (e.g. Send to customer). */
  actions?: ReactNode;
}

function formatPaymentMethod(method: string) {
  return method.replace(/_/g, ' ');
}

function AddressLines({ address }: { address: NonNullable<OrderInvoice['billingAddress']> }) {
  return (
    <address className="mt-1.5 space-y-0.5 text-[13px] not-italic leading-snug text-neutral-700">
      <p className="font-medium text-neutral-950">{address.fullName}</p>
      <p>{address.line1}</p>
      {address.line2 ? <p>{address.line2}</p> : null}
      <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
      {address.country ? <p>{address.country}</p> : null}
    </address>
  );
}

export function InvoiceView({ invoice, actions }: InvoiceViewProps) {
  const handlePrint = () => printInvoiceDocument(invoice);
  const pdfAvailable = invoice.pdf.status === 'ready' && invoice.pdf.url;
  const pdfPending =
    !pdfAvailable && (invoice.pdf.status === 'not_generated' || invoice.pdf.status === 'pending');
  const discount = Number(invoice.totals.discount ?? 0);

  return (
    <article className="invoice-print-root overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-neutral-100 px-5 py-2.5">
        {pdfAvailable ? (
          <Button asChild variant="outline" size="sm">
            <a href={invoice.pdf.url!} target="_blank" rel="noopener noreferrer" download>
              <Download className="size-4" aria-hidden />
              Download PDF
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="size-4" aria-hidden />
            Download / Print
          </Button>
        )}
        {pdfAvailable ? (
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="size-4" aria-hidden />
            Print
          </Button>
        ) : null}
        {actions}
      </div>

      {pdfPending ? (
        <p className="border-b border-neutral-100 px-5 py-2.5 text-sm text-neutral-500">
          PDF file is not ready yet. Use <strong>Download / Print</strong> to save a copy, or send
          the invoice link to the customer by email.
        </p>
      ) : null}
      {!pdfAvailable && !pdfPending && invoice.pdf.message ? (
        <p className="border-b border-neutral-100 px-5 py-2.5 text-sm text-neutral-500">
          {invoice.pdf.message}
        </p>
      ) : null}

      <div className="invoice-sheet px-5 py-5">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-950 pb-4">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Fashion Edge
            </p>
            <h1 className="font-display mt-0.5 text-2xl font-bold tracking-tight text-neutral-950">
              INVOICE
            </h1>
            <p className="mt-1 text-[11px] text-neutral-500">fe.lk · Contemporary fashion</p>
          </div>
          <div className="text-right text-[11px] leading-relaxed">
            <p className="font-mono text-[12px] font-semibold tracking-tight text-neutral-950">
              {invoice.invoiceNumber}
            </p>
            <dl className="mt-1.5 space-y-0.5 text-neutral-600">
              <div className="flex justify-end gap-2">
                <dt className="text-neutral-400">Order</dt>
                <dd className="font-medium text-neutral-800">{invoice.orderNumber}</dd>
              </div>
              {invoice.issuedAt ? (
                <div className="flex justify-end gap-2">
                  <dt className="text-neutral-400">Issued</dt>
                  <dd className="font-medium text-neutral-800">{formatDate(invoice.issuedAt)}</dd>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <dt className="text-neutral-400">Currency</dt>
                <dd className="font-medium text-neutral-800">{invoice.currency}</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Bill to
            </h2>
            {invoice.billingAddress ? (
              <AddressLines address={invoice.billingAddress} />
            ) : invoice.shippingAddress ? (
              <AddressLines address={invoice.shippingAddress} />
            ) : (
              <p className="mt-1.5 text-[13px] text-neutral-500">—</p>
            )}
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Payment
            </h2>
            <div className="mt-1.5 space-y-0.5 text-[13px]">
              <p className="font-medium capitalize text-neutral-950">
                {formatPaymentMethod(invoice.paymentMethod)}
              </p>
              <p className="break-all font-mono text-[11px] text-neutral-500">
                {invoice.paymentReference}
              </p>
            </div>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-neutral-950 text-left">
              <th className="pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Item
              </th>
              <th className="w-14 pb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Qty
              </th>
              <th className="w-28 pb-1.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={`${item.sku}-${item.name}`} className="border-b border-neutral-100">
                <td className="py-2 pr-3 align-top">
                  <p className="font-medium leading-snug text-neutral-950">{item.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-neutral-400">SKU {item.sku}</p>
                </td>
                <td className="py-2 text-center align-top tabular-nums text-neutral-700">
                  {item.quantity}
                </td>
                <td className="py-2 text-right align-top font-medium tabular-nums text-neutral-950">
                  {formatCurrency(item.lineTotal, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <dl className="w-full max-w-60 space-y-1 text-[13px]">
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd className="tabular-nums text-neutral-800">
                {formatCurrency(invoice.totals.subtotal, invoice.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">Shipping</dt>
              <dd className="tabular-nums text-neutral-800">
                {formatCurrency(invoice.totals.shipping, invoice.currency)}
              </dd>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between gap-6">
                <dt className="text-neutral-500">Discount</dt>
                <dd className="tabular-nums text-neutral-800">
                  −{formatCurrency(discount, invoice.currency)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-500">Tax</dt>
              <dd className="tabular-nums text-neutral-800">
                {formatCurrency(invoice.totals.tax, invoice.currency)}
              </dd>
            </div>
            <div className="mt-1 flex justify-between gap-6 bg-neutral-950 px-3 py-2 text-white">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em]">Total due</dt>
              <dd className="font-display text-sm font-bold tabular-nums tracking-tight">
                {formatCurrency(invoice.totals.grandTotal, invoice.currency)}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="mt-5 flex items-end justify-between gap-4 border-t border-neutral-200 pt-3">
          <div>
            <p className="font-display text-[12px] font-semibold tracking-wide text-neutral-950">
              Thank you for shopping with Fashion Edge
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              Questions? Contact support via fe.lk — quote invoice {invoice.invoiceNumber}.
            </p>
          </div>
          <p className="font-display shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
            FE.LK
          </p>
        </footer>
      </div>
    </article>
  );
}
