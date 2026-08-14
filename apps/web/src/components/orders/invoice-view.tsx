import type { ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import type { OrderInvoice } from '@/services/sdk';
import { ordersApi } from '@/services/sdk/admin';
import { formatCurrency, formatDate } from '@/utils/format';
import { printInvoiceDocument } from '@/utils/orders/print-invoice';
import { Button } from '@/components/ui/button';

export interface InvoiceViewProps {
  invoice: OrderInvoice;
  /** Extra actions shown next to download/print (e.g. Send to customer). */
  actions?: ReactNode;
}

function formatPaymentMethod(method: string) {
  return method.replace(/_/g, ' ').toUpperCase();
}

function AddressBlock({ address }: { address: NonNullable<OrderInvoice['shippingAddress']> }) {
  return (
    <div className="space-y-0.5 text-[13px] leading-snug text-neutral-800">
      <p className="text-[15px] font-semibold text-neutral-950">{address.fullName}</p>
      <p>{address.line1}</p>
      {address.line2 ? <p>{address.line2}</p> : null}
      <p>{[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
      {address.country ? <p>{address.country}</p> : null}
      {address.phone ? <p>{address.phone}</p> : null}
    </div>
  );
}

export function InvoiceView({ invoice, actions }: InvoiceViewProps) {
  const recipient = invoice.shippingAddress ?? invoice.billingAddress;
  const discount = Number(invoice.totals.discount ?? 0);

  const handleDownloadPdf = async () => {
    await ordersApi.downloadInvoicePdf(invoice.orderId);
  };

  const handlePrint = () => printInvoiceDocument(invoice);

  return (
    <article className="invoice-print-root overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-neutral-100 px-5 py-2.5 print:hidden">
        <Button variant="outline" size="sm" onClick={() => void handleDownloadPdf()}>
          <Download className="size-4" aria-hidden />
          Download PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="size-4" aria-hidden />
          Print
        </Button>
        {actions}
      </div>

      <div className="invoice-sheet px-6 py-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#D1FAE5] text-lg font-bold lowercase tracking-tight">
              fe.
            </div>
            <div>
              <p className="text-[18px] font-bold tracking-tight text-neutral-950">FASHION EDGE</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                14A Kotugodella st, Kandy
              </p>
            </div>
          </div>
          <span className="rounded-md bg-[#000B26] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
            Official order manifest
          </span>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-4 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
          <div>
            <p>Invoice registry</p>
            <p className="mt-1 text-[15px] font-semibold normal-case tracking-normal text-neutral-950">
              {invoice.orderNumber}
            </p>
          </div>
          <div className="text-right">
            <p>Registry date</p>
            <p className="mt-1 text-[15px] font-semibold normal-case tracking-normal text-neutral-950">
              {invoice.issuedAt ? formatDate(invoice.issuedAt) : '—'}
            </p>
          </div>
        </div>

        <div className="my-4 border-t border-neutral-950" />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Recipient
            </h2>
            {recipient ? (
              <div className="mt-2">
                <AddressBlock address={recipient} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">—</p>
            )}
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Payment details
            </h2>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="text-neutral-400">Method: </span>
                <span className="font-semibold uppercase">
                  {formatPaymentMethod(invoice.paymentMethod)}
                </span>
              </p>
              <p>
                <span className="text-neutral-400">Status: </span>
                <span className="font-semibold uppercase">Success</span>
              </p>
              <p className="break-all font-mono text-[11px] text-neutral-500">
                {invoice.paymentReference}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-sm border border-neutral-200">
          <div className="grid grid-cols-[1fr_72px_120px] bg-neutral-100 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
            <span>Article description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Amount</span>
          </div>
          {invoice.items.map((item) => (
            <div
              key={`${item.sku}-${item.name}`}
              className="grid grid-cols-[1fr_72px_120px] border-t border-neutral-100 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold uppercase tracking-wide text-neutral-950">
                  {item.name}
                </p>
                {item.variantTitle ? (
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-400">
                    {item.variantTitle}
                  </p>
                ) : null}
              </div>
              <p className="text-center tabular-nums">{item.quantity}</p>
              <p className="text-right font-medium tabular-nums">
                {formatCurrency(item.lineTotal, invoice.currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs rounded-xl bg-[#EEF2FF] px-5 py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-neutral-400">Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(invoice.totals.subtotal, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-400">Logistics</span>
                <span className="tabular-nums">
                  {formatCurrency(invoice.totals.shipping, invoice.currency)}
                </span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between gap-4">
                  <span className="text-neutral-400">Discount</span>
                  <span className="tabular-nums">
                    −{formatCurrency(discount, invoice.currency)}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="my-3 border-t border-[#000B26]" />
            <div className="flex items-end justify-between gap-4">
              <span className="text-sm font-bold uppercase tracking-wide">Settlement</span>
              <span className="text-xl font-extrabold tabular-nums tracking-tight">
                {formatCurrency(invoice.totals.grandTotal, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        <footer className="mt-8 border-t border-neutral-200 pt-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Fashion Edge • Curated modern essentials
          </p>
          <p className="mt-1 font-mono text-[11px] text-neutral-300">{invoice.invoiceNumber}</p>
        </footer>
      </div>
    </article>
  );
}
