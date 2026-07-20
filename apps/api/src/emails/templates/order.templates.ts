import { emailLayout, ctaButton } from '@/emails/layout';
import type { EmailTemplate } from './auth.templates';

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
      (l) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eeeeee;">${l.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eeeeee;text-align:center;">${l.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eeeeee;text-align:right;">${currency} ${l.price.toFixed(2)}</td>
    </tr>`,
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
    <thead><tr style="background:#f8f8f8;">
      <th style="padding:8px;text-align:left;border-bottom:2px solid #eeeeee;">Item</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #eeeeee;">Qty</th>
      <th style="padding:8px;text-align:right;border-bottom:2px solid #eeeeee;">Price</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export function orderConfirmationEmail(data: OrderEmailData): EmailTemplate {
  const subject = `Order Confirmed — #${data.orderNumber}`;
  const text = `Hi ${data.name}, your Fashion Edge order #${data.orderNumber} has been confirmed. Total: ${data.currency ?? 'LKR'} ${(data.total ?? 0).toFixed(2)}.`;
  const linesHtml = data.lines ? orderLinesTable(data.lines, data.currency) : '';
  const html = emailLayout(
    `<h2 style="margin:0 0 4px;font-size:20px;color:#1a1a2e;">Order Confirmed!</h2>
     <p style="color:#e94560;font-weight:600;margin:0 0 16px;">Order #${data.orderNumber}</p>
     <p>Hi ${data.name},</p>
     <p>Thank you for your purchase! We've received your order and we'll begin processing it shortly.</p>
     ${data.orderDate ? `<p style="font-size:13px;color:#777777;">Placed on: ${data.orderDate}</p>` : ''}
     ${linesHtml}
     ${data.total !== undefined ? `<p style="text-align:right;font-weight:700;font-size:16px;">Total: ${data.currency ?? 'LKR'} ${data.total.toFixed(2)}</p>` : ''}
     ${data.shippingAddress ? `<p style="font-size:13px;"><strong>Shipping to:</strong><br/>${data.shippingAddress}</p>` : ''}
     ${data.orderUrl ? `<p style="margin:24px 0;">${ctaButton(data.orderUrl, 'View Order')}</p>` : ''}
     <p>We'll send you an update when your order ships. Questions? Reply to this email.</p>`,
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
    `<h2 style="margin:0 0 16px;font-size:20px;">Order Cancelled</h2>
     <p>Hi ${data.name},</p>
     <p>Your order <strong>#${data.orderNumber}</strong> has been cancelled.</p>
     ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
     <p>If any payment was taken it will be refunded within 5–7 business days.</p>
     ${data.orderUrl ? `<p style="margin:24px 0;">${ctaButton(data.orderUrl, 'View Order Details')}</p>` : ''}
     <p>If you have questions, please contact our support team.</p>`,
    { title: 'Order Cancelled', preheader: `Your order #${data.orderNumber} has been cancelled.` },
  );
  return { subject, html, text };
}

export function returnRequestedEmail(data: {
  name: string;
  orderNumber: string;
  returnId?: string;
}): EmailTemplate {
  const subject = `Return Requested — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, your return request for order #${data.orderNumber} has been received.`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Return Request Received</h2>
     <p>Hi ${data.name},</p>
     <p>We've received your return request for order <strong>#${data.orderNumber}</strong>${data.returnId ? ` (Return ID: ${data.returnId})` : ''}.</p>
     <p>Our team will review it within 1–2 business days and send you further instructions.</p>`,
    { title: 'Return Requested', preheader: 'Your return request is being processed.' },
  );
  return { subject, html, text };
}

export function returnApprovedEmail(data: {
  name: string;
  orderNumber: string;
  instructions?: string;
}): EmailTemplate {
  const subject = `Return Approved — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, your return for order #${data.orderNumber} has been approved.`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Return Approved</h2>
     <p>Hi ${data.name},</p>
     <p>Great news — your return for order <strong>#${data.orderNumber}</strong> has been approved.</p>
     ${data.instructions ? `<p><strong>Next steps:</strong><br/>${data.instructions}</p>` : '<p>Please ship the item(s) back using the prepaid label that will be emailed separately.</p>'}`,
    {
      title: 'Return Approved',
      preheader: `Your return for order #${data.orderNumber} is approved.`,
    },
  );
  return { subject, html, text };
}

export function refundProcessedEmail(data: {
  name: string;
  orderNumber: string;
  amount: number;
  currency?: string;
}): EmailTemplate {
  const subject = `Refund Processed — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, your refund of ${data.currency ?? 'LKR'} ${data.amount.toFixed(2)} for order #${data.orderNumber} has been processed.`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Refund Processed</h2>
     <p>Hi ${data.name},</p>
     <p>Your refund for order <strong>#${data.orderNumber}</strong> has been processed.</p>
     <p style="font-size:18px;font-weight:700;color:#e94560;">Refund: ${data.currency ?? 'LKR'} ${data.amount.toFixed(2)}</p>
     <p>Please allow 5–7 business days for the amount to appear on your original payment method.</p>`,
    {
      title: 'Refund Processed',
      preheader: `Refund of ${data.currency ?? 'LKR'} ${data.amount.toFixed(2)} is on its way.`,
    },
  );
  return { subject, html, text };
}
