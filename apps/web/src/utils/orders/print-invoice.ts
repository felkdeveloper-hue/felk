import type { OrderInvoice } from '@/services/sdk';

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

function addressHtml(address: NonNullable<OrderInvoice['billingAddress']>): string {
  const lines = [
    `<div class="name">${escapeHtml(address.fullName)}</div>`,
    address.line1 ? `<div>${escapeHtml(address.line1)}</div>` : '',
    address.line2 ? `<div>${escapeHtml(address.line2)}</div>` : '',
    `<div>${escapeHtml([address.city, address.state, address.postalCode].filter(Boolean).join(', '))}</div>`,
    address.country ? `<div>${escapeHtml(address.country)}</div>` : '',
    address.phone ? `<div>${escapeHtml(address.phone)}</div>` : '',
  ].filter(Boolean);

  return lines.join('');
}

/** Opens a one-page invoice matching the Fashion Edge order-manifest layout. */
export function printInvoiceDocument(invoice: OrderInvoice): void {
  const recipient = invoice.shippingAddress ?? invoice.billingAddress;
  const discount = Number(invoice.totals.discount ?? 0);
  const issued = formatRegistryDate(invoice.issuedAt);

  const itemRows = invoice.items
    .map(
      (item) => `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(item.name)}</div>
          ${item.variantTitle ? `<div class="item-meta">${escapeHtml(item.variantTitle)}</div>` : ''}
        </td>
        <td class="center">${item.quantity}</td>
        <td class="right">${escapeHtml(formatMoney(item.lineTotal, invoice.currency))}</td>
      </tr>`,
    )
    .join('');

  const discountRow =
    discount > 0
      ? `<div class="row"><span>Discount</span><span>−${escapeHtml(formatMoney(discount, invoice.currency, false))}</span></div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.orderNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: Figtree, ui-sans-serif, system-ui, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 18mm 16mm;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      margin: 0;
      font-family: Syne, sans-serif;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.06em;
      line-height: 1;
    }
    .store-name {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1;
    }
    .store-address {
      margin: 6px 0 0;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #9CA3AF;
    }
    .badge {
      background: #000B26;
      color: #fff;
      border-radius: 999px;
      padding: 8px 16px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .registry {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
    }
    .label {
      margin: 0;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #9CA3AF;
    }
    .order-no {
      margin: 8px 0 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .date {
      margin: 8px 0 0;
      font-size: 16px;
      font-weight: 700;
      text-align: right;
    }
    .rule {
      margin-top: 18px;
      border-top: 1.5px solid #111;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 24px;
    }
    .name {
      margin: 8px 0 4px;
      font-size: 16px;
      font-weight: 700;
      color: #111;
    }
    .addr {
      color: #6B7280;
      font-size: 13px;
      line-height: 1.55;
    }
    .pay {
      margin-top: 8px;
      font-size: 13px;
      line-height: 1.7;
    }
    .pay span { color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.04em; }
    .pay strong { color: #111; letter-spacing: 0.04em; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 40px;
    }
    thead th {
      padding: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      text-align: left;
      border-bottom: 1px solid #111;
    }
    th.center, td.center { text-align: center; width: 72px; }
    th.right, td.right { text-align: right; width: 140px; }
    tbody td {
      padding: 16px 0;
      border-bottom: 1px solid #E5E7EB;
      vertical-align: top;
    }
    .item-name {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .item-meta {
      margin-top: 4px;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #9CA3AF;
    }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 32px;
    }
    .totals {
      width: 260px;
      background: #F3F4F6;
      border-radius: 14px;
      padding: 16px 20px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
      font-size: 11px;
    }
    .row span:first-child {
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 500;
    }
    .row span:last-child { font-weight: 700; }
    .totals hr {
      border: 0;
      border-top: 1px solid #000B26;
      margin: 8px 0 12px;
    }
    .settle {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
      color: #000B26;
    }
    .settle span:first-child {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .settle span:last-child {
      font-size: 18px;
      font-weight: 800;
    }
    footer {
      margin-top: auto;
      padding-top: 48px;
      text-align: center;
      font-size: 9px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #C4C4C4;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <p class="logo">FE</p>
        <div>
          <p class="store-name">Fashion Edge</p>
          <p class="store-address">14A Kotugodella st, Kandy</p>
        </div>
      </div>
      <span class="badge">Official order manifest</span>
    </div>

    <div class="registry">
      <div>
        <p class="label">Invoice registry</p>
        <p class="order-no">${escapeHtml(invoice.orderNumber)}</p>
      </div>
      <div>
        <p class="label" style="text-align:right">Registry date</p>
        <p class="date">${escapeHtml(issued)}</p>
      </div>
    </div>
    <div class="rule"></div>

    <div class="parties">
      <div>
        <p class="label">Recipient</p>
        <div class="addr">${recipient ? addressHtml(recipient) : '—'}</div>
      </div>
      <div>
        <p class="label">Payment details</p>
        <div class="pay">
          <div><span>Method: </span><strong>${escapeHtml(formatPaymentMethod(invoice.paymentMethod))}</strong></div>
          <div><span>Status: </span><strong>SUCCESS</strong></div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Article description</th>
          <th class="center">Qty</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${escapeHtml(formatMoney(invoice.totals.subtotal, invoice.currency, false))}</span></div>
        <div class="row"><span>Logistics</span><span>${escapeHtml(formatMoney(invoice.totals.shipping, invoice.currency, false))}</span></div>
        ${discountRow}
        <hr />
        <div class="settle">
          <span>Settlement</span>
          <span>${escapeHtml(formatMoney(invoice.totals.grandTotal, invoice.currency))}</span>
        </div>
      </div>
    </div>

    <footer>Fashion Edge • Curated modern essentials</footer>
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
