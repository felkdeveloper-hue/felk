import type { OrderInvoice } from '@/services/sdk';
import { formatCurrency, formatDate } from '@/utils/format';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPaymentMethod(method: string) {
  const label = method.replace(/_/g, ' ').trim();
  if (label.toLowerCase() === 'cod') return 'Cash on Delivery';
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

function addressHtml(address: NonNullable<OrderInvoice['billingAddress']>): string {
  const lines = [
    `<strong>${escapeHtml(address.fullName)}</strong>`,
    escapeHtml(address.line1),
    address.line2 ? escapeHtml(address.line2) : '',
    escapeHtml([address.city, address.state, address.postalCode].filter(Boolean).join(', ')),
    address.country ? escapeHtml(address.country) : '',
    address.phone ? `Tel: ${escapeHtml(address.phone)}` : '',
  ].filter(Boolean);

  return lines.map((line) => `<div>${line}</div>`).join('');
}

/** Opens a clean one-page invoice document and triggers the browser print dialog. */
export function printInvoiceDocument(invoice: OrderInvoice): void {
  const billTo = invoice.billingAddress ?? invoice.shippingAddress;
  const shipTo = invoice.shippingAddress ?? invoice.billingAddress;
  const discount = Number(invoice.totals.discount ?? 0);
  const issued = invoice.issuedAt ? formatDate(invoice.issuedAt) : '—';
  const itemCount = invoice.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

  const itemRows = invoice.items
    .map((item) => {
      const unit = item.quantity > 0 ? item.lineTotal / item.quantity : item.price;
      return `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-sku">SKU ${escapeHtml(item.sku)}</div>
        </td>
        <td class="right mono">${escapeHtml(formatCurrency(unit, invoice.currency))}</td>
        <td class="center">${item.quantity}</td>
        <td class="right mono">${escapeHtml(formatCurrency(item.lineTotal, invoice.currency))}</td>
      </tr>`;
    })
    .join('');

  const discountRow =
    discount > 0
      ? `<div class="row"><span>Discount</span><span>−${escapeHtml(formatCurrency(discount, invoice.currency))}</span></div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      color: #111;
      font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
      font-size: 12.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .sheet {
      width: 100%;
      min-height: 277mm;
      height: 277mm;
      display: grid;
      /* Grow the notes + totals band — not an empty hole under items */
      grid-template-rows: auto auto auto minmax(150px, 1fr) auto;
      gap: 0;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }

    .label {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #888;
    }

    /* —— Header —— */
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 16px;
      border-bottom: 2.5px solid #111;
    }

    .brand-kicker {
      margin: 0;
      font-family: Syne, sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: #777;
    }

    h1 {
      margin: 4px 0 0;
      font-family: Syne, sans-serif;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .tagline {
      margin: 8px 0 0;
      color: #777;
      font-size: 12px;
    }

    .meta-card {
      min-width: 46%;
      background: #f6f6f6;
      border: 1px solid #e8e8e8;
      padding: 14px 16px;
    }

    .meta-card .inv-no {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 14px;
      font-size: 12px;
    }

    .meta-grid dt { color: #888; }
    .meta-grid dd { margin: 0; font-weight: 600; text-align: right; }

    /* —— Parties —— */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 18px;
      margin-top: 20px;
      padding-bottom: 18px;
      border-bottom: 1px solid #ddd;
    }

    .party {
      min-height: 110px;
    }

    .party address,
    .party .body {
      font-style: normal;
      color: #333;
      font-size: 12.5px;
      line-height: 1.55;
    }

    .party strong {
      color: #111;
      font-size: 13.5px;
    }

    .pay-method {
      margin: 0 0 4px;
      font-weight: 700;
      font-size: 13.5px;
    }

    .pay-ref {
      margin: 0;
      font-size: 11px;
      color: #777;
      word-break: break-all;
    }

    /* —— Items —— */
    .items {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
    }

    .items-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
    }

    .items-head h2 {
      margin: 0;
      font-family: Syne, sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .items-head span {
      color: #888;
      font-size: 11.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      padding: 10px 8px;
      background: #111;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      text-align: left;
    }

    thead th.center { text-align: center; }
    thead th.right { text-align: right; }

    tbody td {
      padding: 14px 8px;
      border-bottom: 1px solid #e8e8e8;
      vertical-align: top;
      font-size: 13px;
    }

    tbody tr:nth-child(even) td {
      background: #fafafa;
    }

    td.center { text-align: center; }
    td.right { text-align: right; font-weight: 600; }

    .item-name { font-weight: 700; color: #111; }
    .item-sku {
      margin-top: 3px;
      font-size: 11px;
      color: #888;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    /* —— Bottom band —— */
    .bottom {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 20px;
      align-items: stretch;
      margin-top: 20px;
      min-height: 0;
    }

    .notes {
      border: 1px solid #e4e4e4;
      background: #fafafa;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      height: 100%;
    }

    .notes h3 {
      margin: 0;
      font-family: Syne, sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .notes p {
      margin: 0;
      color: #444;
      font-size: 12px;
      line-height: 1.55;
    }

    .notes ul {
      margin: 0;
      padding-left: 16px;
      color: #444;
      font-size: 12px;
    }

    .notes li { margin-top: 4px; }

    .totals {
      border: 1px solid #111;
      padding: 16px 18px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 7px;
      color: #444;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }

    .total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-top: 12px;
      padding: 12px 14px;
      background: #111;
      color: #fff;
    }

    .total span:first-child {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .total span:last-child {
      font-family: Syne, sans-serif;
      font-size: 20px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #ddd;
    }

    footer .thanks {
      margin: 0;
      font-family: Syne, sans-serif;
      font-size: 13px;
      font-weight: 700;
    }

    footer .help {
      margin: 3px 0 0;
      font-size: 11px;
      color: #777;
    }

    footer .mark {
      margin: 0;
      font-family: Syne, sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.24em;
      color: #bbb;
    }

    @media print {
      .sheet {
        height: 277mm;
        overflow: hidden;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="topbar">
      <div>
        <p class="brand-kicker">Fashion Edge</p>
        <h1>INVOICE</h1>
        <p class="tagline">fe.lk · Contemporary fashion</p>
      </div>
      <div class="meta-card">
        <div class="inv-no">${escapeHtml(invoice.invoiceNumber)}</div>
        <dl class="meta-grid">
          <dt>Order</dt><dd>${escapeHtml(invoice.orderNumber)}</dd>
          <dt>Issued</dt><dd>${escapeHtml(issued)}</dd>
          <dt>Currency</dt><dd>${escapeHtml(invoice.currency)}</dd>
          <dt>Items</dt><dd>${itemCount}</dd>
        </dl>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <p class="label">Bill to</p>
        <address>${billTo ? addressHtml(billTo) : '—'}</address>
      </div>
      <div class="party">
        <p class="label">Ship to</p>
        <address>${shipTo ? addressHtml(shipTo) : '—'}</address>
      </div>
      <div class="party">
        <p class="label">Payment</p>
        <div class="body">
          <p class="pay-method">${escapeHtml(formatPaymentMethod(invoice.paymentMethod))}</p>
          <p class="pay-ref">${escapeHtml(invoice.paymentReference)}</p>
        </div>
      </div>
    </div>

    <div class="items">
      <div class="items-head">
        <h2>Order items</h2>
        <span>${invoice.items.length} line${invoice.items.length === 1 ? '' : 's'} · ${itemCount} unit${itemCount === 1 ? '' : 's'}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right" style="width:120px">Unit</th>
            <th class="center" style="width:64px">Qty</th>
            <th class="right" style="width:130px">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <div class="bottom">
      <div class="notes">
        <div>
          <h3>Payment & delivery</h3>
          <p>
            Payment method: <strong>${escapeHtml(formatPaymentMethod(invoice.paymentMethod))}</strong>.
            Please keep this invoice for your records and present the order number on delivery if requested.
          </p>
        </div>
        <div>
          <h3>Customer care</h3>
          <p>
            Fashion Edge is committed to quality and a smooth delivery experience. If anything is missing
            or not as expected, reach out with your invoice number and we will help promptly.
          </p>
        </div>
        <div>
          <h3>Notes</h3>
          <ul>
            <li>Prices are shown in ${escapeHtml(invoice.currency)} and include applicable line discounts.</li>
            <li>For returns or exchanges, contact support within the store policy window.</li>
            <li>Quote invoice ${escapeHtml(invoice.invoiceNumber)} in all support requests.</li>
          </ul>
        </div>
      </div>

      <div class="totals">
        <div>
          <p class="label" style="margin-bottom:8px">Amount summary</p>
          <div class="row"><span>Subtotal</span><span>${escapeHtml(formatCurrency(invoice.totals.subtotal, invoice.currency))}</span></div>
          <div class="row"><span>Shipping</span><span>${escapeHtml(formatCurrency(invoice.totals.shipping, invoice.currency))}</span></div>
          ${discountRow}
          <div class="row"><span>Tax</span><span>${escapeHtml(formatCurrency(invoice.totals.tax, invoice.currency))}</span></div>
        </div>
        <div class="total">
          <span>Total due</span>
          <span>${escapeHtml(formatCurrency(invoice.totals.grandTotal, invoice.currency))}</span>
        </div>
      </div>
    </div>

    <footer>
      <div>
        <p class="thanks">Thank you for shopping with Fashion Edge</p>
        <p class="help">fe.lk · Support · Quote ${escapeHtml(invoice.invoiceNumber)}</p>
      </div>
      <p class="mark">FE.LK</p>
    </footer>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    });
    window.addEventListener('afterprint', function () {
      window.close();
    });
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
