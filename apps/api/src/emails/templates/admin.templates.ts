import { emailLayout, ctaButton } from '@/emails/layout';
import type { EmailTemplate } from './auth.templates';

export function lowStockAlertEmail(data: {
  productName: string;
  sku?: string;
  currentStock: number;
  threshold: number;
  adminUrl?: string;
}): EmailTemplate {
  const subject = `Low Stock Alert: ${data.productName}`;
  const text = `Low stock alert: ${data.productName}${data.sku ? ` (SKU: ${data.sku})` : ''} has ${data.currentStock} unit(s) remaining (threshold: ${data.threshold}).`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;color:#e94560;">Low Stock Alert</h2>
     <p>The following product is running low on stock and requires attention.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Product</td><td style="padding:8px;border:1px solid #eeeeee;">${data.productName}</td></tr>
       ${data.sku ? `<tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">SKU</td><td style="padding:8px;border:1px solid #eeeeee;">${data.sku}</td></tr>` : ''}
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Current Stock</td><td style="padding:8px;border:1px solid #eeeeee;color:#e94560;font-weight:700;">${data.currentStock} unit(s)</td></tr>
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Alert Threshold</td><td style="padding:8px;border:1px solid #eeeeee;">${data.threshold} unit(s)</td></tr>
     </table>
     ${data.adminUrl ? `<p style="margin:24px 0;">${ctaButton(data.adminUrl, 'Manage Inventory')}</p>` : ''}`,
    {
      title: 'Low Stock Alert',
      preheader: `Low stock: ${data.productName} has ${data.currentStock} units remaining.`,
    },
  );
  return { subject, html, text };
}

export function newOrderAlertEmail(data: {
  orderNumber: string;
  customerName?: string;
  total: number;
  currency?: string;
  itemCount: number;
  adminUrl?: string;
}): EmailTemplate {
  const currency = data.currency ?? 'LKR';
  const subject = `New Order #${data.orderNumber}`;
  const text = `New order #${data.orderNumber}${data.customerName ? ` from ${data.customerName}` : ''} — ${currency} ${data.total.toFixed(2)} (${data.itemCount} item(s)).`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">New Order Received</h2>
     <p>A new order has been placed on Fashion Edge.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Order</td><td style="padding:8px;border:1px solid #eeeeee;">#${data.orderNumber}</td></tr>
       ${data.customerName ? `<tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Customer</td><td style="padding:8px;border:1px solid #eeeeee;">${data.customerName}</td></tr>` : ''}
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Items</td><td style="padding:8px;border:1px solid #eeeeee;">${data.itemCount}</td></tr>
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Total</td><td style="padding:8px;border:1px solid #eeeeee;color:#e94560;font-weight:700;">${currency} ${data.total.toFixed(2)}</td></tr>
     </table>
     ${data.adminUrl ? `<p style="margin:24px 0;">${ctaButton(data.adminUrl, 'View Order')}</p>` : ''}`,
    {
      title: 'New Order',
      preheader: `New order #${data.orderNumber} — ${currency} ${data.total.toFixed(2)}.`,
    },
  );
  return { subject, html, text };
}
