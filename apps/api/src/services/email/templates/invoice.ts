import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailParagraph,
  orderReference,
  totalRow,
  type EmailTemplateResult,
} from '@/services/email/templates/layout';
import type { OrderEmailData } from '@/services/email/templates/order-types';

export function invoiceTemplate(order: OrderEmailData): EmailTemplateResult {
  const currency = order.currency ?? 'LKR';
  const invoiceNo = order.invoiceNumber ?? order.orderNumber;
  const subject = `Invoice #${invoiceNo} — Fashion Edge`;
  const text = `Hi ${order.name}, your invoice #${invoiceNo} for order #${order.orderNumber} is ready. Total: ${currency} ${order.total?.toFixed(2) ?? '0.00'}.`;
  const html = emailLayout(
    `${orderReference('Invoice', `#${invoiceNo}`)}
     ${emailHeading('Your invoice')}
     ${emailGreeting(order.name)}
     ${emailParagraph(`Your invoice for order <strong>#${order.orderNumber}</strong> is ready for your records.`)}
     ${order.total !== undefined ? totalRow(currency, order.total) : ''}
     ${order.orderUrl ? ctaButton(order.orderUrl, 'View invoice') : ''}`,
    { title: 'Invoice', preheader: `Invoice #${invoiceNo} for your order.` },
  );
  return { subject, html, text };
}
