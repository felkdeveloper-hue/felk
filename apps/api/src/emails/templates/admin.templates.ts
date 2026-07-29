import {
  ctaButton,
  emailHeading,
  emailLayout,
  emailParagraph,
  infoTable,
  orderReference,
} from '@/emails/layout.js';
import type { EmailTemplate } from './auth.templates.js';

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
    `${emailHeading('Low stock alert')}
     ${emailParagraph('The following product is running low on stock and requires attention.')}
     ${infoTable([
       { label: 'Product', value: data.productName },
       ...(data.sku ? [{ label: 'SKU', value: data.sku }] : []),
       { label: 'Current stock', value: `${data.currentStock} unit(s)` },
       { label: 'Alert threshold', value: `${data.threshold} unit(s)` },
     ])}
     ${data.adminUrl ? ctaButton(data.adminUrl, 'Manage inventory') : ''}`,
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
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('New order received')}
     ${emailParagraph('A new order has been placed on Fashion Edge.')}
     ${infoTable([
       { label: 'Order', value: `#${data.orderNumber}` },
       ...(data.customerName ? [{ label: 'Customer', value: data.customerName }] : []),
       { label: 'Items', value: String(data.itemCount) },
       { label: 'Total', value: `${currency} ${data.total.toFixed(2)}` },
     ])}
     ${data.adminUrl ? ctaButton(data.adminUrl, 'View in admin') : ''}`,
    { title: 'New Order', preheader: `New order #${data.orderNumber} received.` },
  );
  return { subject, html, text };
}
