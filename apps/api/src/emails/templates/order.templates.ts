import {
  ctaButton,
  emailEyebrow,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  orderReference,
  totalRow,
} from '@/emails/layout.js';
import type { EmailTemplate } from './auth.templates.js';

export interface OrderLine {
  name: string;
  quantity: number;
  price: number;
  currency?: string;
}

export interface OrderEmailData {
  name: string;
  orderNumber: string;
  orderDate?: string;
  lines?: OrderLine[];
  total?: number;
  currency?: string;
  shippingAddress?: string;
  orderUrl?: string;
}

function orderLinesTable(lines: OrderLine[], currency = 'LKR'): string {
  const rows = lines
    .map(
      (line) => `<tr>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1f2937;">${line.name}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:14px;color:#1f2937;">${line.quantity}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;color:#1f2937;">${currency} ${line.price.toFixed(2)}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;">
    <thead><tr style="background:#fafafa;">
      <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Item</th>
      <th style="padding:12px 14px;text-align:center;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Qty</th>
      <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;">Price</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function orderConfirmationEmail(data: OrderEmailData): EmailTemplate {
  const currency = data.currency ?? 'LKR';
  const subject = `Order Confirmed — #${data.orderNumber}`;
  const text = `Hi ${data.name}, your Fashion Edge order #${data.orderNumber} has been confirmed. Total: ${currency} ${(data.total ?? 0).toFixed(2)}.`;
  const linesHtml = data.lines ? orderLinesTable(data.lines, currency) : '';
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Your order is confirmed')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`Thank you for your purchase. We're preparing your items and will notify you when they ship.`)}
     ${data.orderDate ? emailEyebrow(`Placed on ${data.orderDate}`) : ''}
     ${linesHtml}
     ${data.total !== undefined ? totalRow(currency, data.total) : ''}
     ${data.shippingAddress ? emailParagraph(`<strong>Shipping to:</strong><br/>${data.shippingAddress}`) : ''}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View order') : ''}
     ${emailMuted(`We'll send you an update when your order ships.`)}`,
    { title: 'Order Confirmed', preheader: `Order #${data.orderNumber} confirmed. Thank you!` },
  );
  return { subject, html, text };
}

export function orderCancelledEmail(data: {
  name: string;
  orderNumber: string;
  reason?: string;
  orderUrl?: string;
}): EmailTemplate {
  const subject = `Order Cancelled — #${data.orderNumber}`;
  const text = `Hi ${data.name}, your order #${data.orderNumber} has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ''}`;
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Order cancelled')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`Your order <strong>#${data.orderNumber}</strong> has been cancelled.`)}
     ${data.reason ? emailParagraph(`<strong>Reason:</strong> ${data.reason}`) : ''}
     ${emailMuted('If any payment was taken it will be refunded within 5–7 business days.')}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View order') : ''}`,
    { title: 'Order Cancelled', preheader: `Your order #${data.orderNumber} has been cancelled.` },
  );
  return { subject, html, text };
}

export function returnRequestedEmail(data: {
  name: string;
  orderNumber: string;
  returnNumber?: string;
  orderUrl?: string;
}): EmailTemplate {
  const subject = `Return Request Received — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, we've received your return request for order #${data.orderNumber}.`;
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Return request received')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`We've received your return request${data.returnNumber ? ` (<strong>${data.returnNumber}</strong>)` : ''} and will review it shortly.`)}
     ${emailMuted('Our team will email you once your return has been approved with next steps.')}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View return') : ''}`,
    { title: 'Return Requested', preheader: `Return request for order #${data.orderNumber}.` },
  );
  return { subject, html, text };
}

export function returnApprovedEmail(data: {
  name: string;
  orderNumber: string;
  returnNumber?: string;
  instructions?: string;
  orderUrl?: string;
}): EmailTemplate {
  const subject = `Return Approved — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, your return for order #${data.orderNumber} has been approved.`;
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Return approved')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`Your return request has been approved.`)}
     ${data.instructions ? emailParagraph(data.instructions) : emailParagraph('Please follow the return instructions provided by our team.')}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View return') : ''}`,
    { title: 'Return Approved', preheader: `Return approved for order #${data.orderNumber}.` },
  );
  return { subject, html, text };
}

export function refundProcessedEmail(data: {
  name: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  orderUrl?: string;
}): EmailTemplate {
  const currency = data.currency ?? 'LKR';
  const subject = `Refund Processed — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, a refund of ${currency} ${data.amount.toFixed(2)} for order #${data.orderNumber} has been processed.`;
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Refund processed')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`We've processed a refund of <strong>${currency} ${data.amount.toFixed(2)}</strong> for your order.`)}
     ${emailMuted('Funds may take 5–7 business days to appear on your statement.')}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View order') : ''}`,
    { title: 'Refund Processed', preheader: `Refund for order #${data.orderNumber}.` },
  );
  return { subject, html, text };
}

// ─── Generic status-update notification ──────────────────────────────────────

export type NotifiableOrderStatus =
  | 'confirmed'
  | 'packed'
  | 'ready_for_shipment'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned'
  | 'refund_pending'
  | 'refunded';

interface StatusCopy {
  heading: string;
  body: string;
  footer: string;
}

const STATUS_COPY: Record<NotifiableOrderStatus, StatusCopy> = {
  confirmed: {
    heading: 'Congratulations — your order is confirmed!',
    body: "We've confirmed your order and our team is getting your items ready. Thank you for shopping with us!",
    footer: "We'll email you again once your order is packed.",
  },
  packed: {
    heading: 'Your order has been packed',
    body: 'Great news — your order has been carefully packed and is waiting for carrier pickup.',
    footer: "We'll notify you as soon as it ships out for delivery.",
  },
  ready_for_shipment: {
    heading: 'Your order is ready to ship',
    body: 'Your order is ready for shipment and will leave our warehouse shortly.',
    footer: 'Expect a shipping confirmation email soon.',
  },
  shipped: {
    heading: 'Your order has been shipped out for delivery!',
    body: 'Congratulations — your order is on its way. It has been shipped out and is heading to your delivery address.',
    footer:
      'Delivery usually takes 3–7 business days. You can track progress anytime from your account.',
  },
  delivered: {
    heading: 'Your order has been delivered',
    body: 'Congratulations — your order has been delivered. We hope you love your new pieces!',
    footer:
      'If anything is missing or not as expected, contact our support team and we will help right away.',
  },
  completed: {
    heading: 'Your order is complete',
    body: 'Thank you again for shopping with Fashion Edge. Your order is now complete.',
    footer: 'We hope to see you again soon.',
  },
  cancelled: {
    heading: 'Your order has been cancelled',
    body: 'Your order has been cancelled. If this was unexpected, please contact our support team.',
    footer: 'If any payment was taken it will be refunded within 5–7 business days.',
  },
  returned: {
    heading: 'Return started for your order',
    body: "We've started the return process for your order. Our team will be in touch with next steps.",
    footer: 'Please keep any return packaging or labels until the process is complete.',
  },
  refund_pending: {
    heading: 'Your refund is being processed',
    body: "Good news — your refund is now being processed. We're working to get it back to you as soon as possible.",
    footer: 'Funds typically take 5–7 business days to appear on your statement.',
  },
  refunded: {
    heading: 'Your refund has been issued',
    body: "We've issued a refund for your order. The amount should appear in your account soon.",
    footer: 'Please allow 5–7 business days for the funds to show on your statement.',
  },
};

const STATUS_LABEL: Record<NotifiableOrderStatus, string> = {
  confirmed: 'Confirmed',
  packed: 'Packed',
  ready_for_shipment: 'Ready for Shipment',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Return Initiated',
  refund_pending: 'Refund Pending',
  refunded: 'Refunded',
};

export interface OrderStatusUpdateEmailData {
  name: string;
  orderNumber: string;
  status: NotifiableOrderStatus;
  /** Optional human-readable message from the admin (shown to the customer). */
  updateMessage?: string;
  orderUrl?: string;
}

export function orderStatusUpdateEmail(data: OrderStatusUpdateEmailData): EmailTemplate {
  const copy = STATUS_COPY[data.status];
  const label = STATUS_LABEL[data.status];
  const subject = `Order Update: ${label} — #${data.orderNumber}`;
  const updateNote = data.updateMessage ? ` Message from our team: ${data.updateMessage}` : '';
  const text =
    `Hi ${data.name}, your order #${data.orderNumber} has been updated to: ${label}.` +
    ` ${copy.body}${updateNote}`;

  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailEyebrow(label)}
     ${emailHeading(copy.heading)}
     ${emailGreeting(data.name)}
     ${emailParagraph(copy.body)}
     ${data.updateMessage ? emailParagraph(`<strong>Message from our team:</strong><br/>${data.updateMessage}`) : ''}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View order') : ''}
     ${emailMuted(copy.footer)}`,
    {
      title: `Order ${label}`,
      preheader: `Order #${data.orderNumber} — ${copy.heading.toLowerCase()}.`,
    },
  );
  return { subject, html, text };
}
