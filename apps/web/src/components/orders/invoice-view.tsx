import type { ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import type { OrderInvoice } from '@/services/sdk';
import { ordersApi } from '@/services/sdk/admin';
import { printInvoiceDocument } from '@/utils/orders/print-invoice';
import { FeLogo } from '@/components/brand/fe-logo';
import { Button } from '@/components/ui/button';

export interface InvoiceViewProps {
  invoice: OrderInvoice;
  /** Extra actions shown next to download/print (e.g. Send to customer). */
  actions?: ReactNode;
}

function formatPaymentMethod(method: string) {
  const label = method.replace(/_/g, ' ').trim();
  if (label.toLowerCase() === 'cod') return 'CASH ON DELIVERY';
  return label.toUpperCase();
}

function formatMoney(amount: number, currency = 'LKR', withCode = true) {
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return withCode ? `${currency} ${value}` : value;
}

function formatRegistryDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

function AddressBlock({ address }: { address: NonNullable<OrderInvoice['shippingAddress']> }) {
  return (
    <div className="mt-2 space-y-0.5 text-[13px] leading-[1.55] text-[#6B7280]">
      <p className="text-[16px] font-bold leading-snug text-[#111]">{address.fullName}</p>
      {address.line1 ? <p>{address.line1}</p> : null}
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
    <article className="invoice-print-root overflow-hidden rounded-sm border border-neutral-200 bg-white text-[#111] shadow-sm">
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

      <div className="invoice-sheet mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-[52px] py-[48px] font-sans">
        <header className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <FeLogo size={48} />
            <div>
              <p className="text-[20px] font-extrabold uppercase leading-none tracking-[0.02em] text-[#111]">
                Fashion Edge
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#9CA3AF]">
                14A Kotugodella st, Kandy
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#000B26] px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
            Official order manifest
          </span>
        </header>

        <div className="mt-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">
              Invoice registry
            </p>
            <p className="mt-1.5 text-[22px] font-extrabold leading-none tracking-tight text-[#111]">
              {invoice.orderNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">
              Registry date
            </p>
            <p className="mt-1.5 text-[16px] font-bold leading-none text-[#111]">
              {formatRegistryDate(invoice.issuedAt)}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t-[1.5px] border-[#111]" />

        <div className="mt-6 grid grid-cols-2 gap-10">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">
              Recipient
            </p>
            {recipient ? (
              <AddressBlock address={recipient} />
            ) : (
              <p className="mt-2 text-sm text-[#9CA3AF]">—</p>
            )}
          </div>
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">
              Payment details
            </p>
            <div className="mt-2 space-y-1 text-[13px]">
              <p>
                <span className="uppercase tracking-wide text-[#9CA3AF]">Method: </span>
                <span className="font-bold uppercase tracking-wide text-[#111]">
                  {formatPaymentMethod(invoice.paymentMethod)}
                </span>
              </p>
              <p>
                <span className="uppercase tracking-wide text-[#9CA3AF]">Status: </span>
                <span className="font-bold uppercase tracking-wide text-[#111]">Success</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="grid grid-cols-[1fr_72px_140px] pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#111]">
            <span>Article description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="border-t border-[#111]" />
          {invoice.items.map((item) => (
            <div
              key={`${item.sku}-${item.name}`}
              className="grid grid-cols-[1fr_72px_140px] items-start border-b border-[#E5E7EB] py-4"
            >
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#111]">
                  {item.name}
                </p>
                {item.variantTitle ? (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#9CA3AF]">
                    {item.variantTitle}
                  </p>
                ) : null}
              </div>
              <p className="text-center text-[13px] font-bold tabular-nums">{item.quantity}</p>
              <p className="text-right text-[13px] font-bold tabular-nums">
                {formatMoney(item.lineTotal, invoice.currency)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-[260px] rounded-xl bg-[#F3F4F6] px-5 py-4">
            <div className="space-y-2.5 text-[11px]">
              <div className="flex justify-between gap-4">
                <span className="font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
                  Subtotal
                </span>
                <span className="font-bold tabular-nums text-[#111]">
                  {formatMoney(invoice.totals.subtotal, invoice.currency, false)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
                  Logistics
                </span>
                <span className="font-bold tabular-nums text-[#111]">
                  {formatMoney(invoice.totals.shipping, invoice.currency, false)}
                </span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between gap-4">
                  <span className="font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">
                    Discount
                  </span>
                  <span className="font-bold tabular-nums text-[#111]">
                    −{formatMoney(discount, invoice.currency, false)}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="my-3 border-t border-[#000B26]" />
            <div className="flex items-end justify-between gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#000B26]">
                Settlement
              </span>
              <span className="text-[18px] font-extrabold tabular-nums leading-none text-[#000B26]">
                {formatMoney(invoice.totals.grandTotal, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[#C4C4C4]">
            Fashion Edge • Curated modern essentials
          </p>
        </footer>
      </div>
    </article>
  );
}
