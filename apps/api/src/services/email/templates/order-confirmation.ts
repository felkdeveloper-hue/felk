import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailParagraph,
  orderReference,
  totalRow,
  type EmailTemplateResult,
} from '@/services/email/templates/layout.js';
import type { OrderEmailData } from '@/services/email/templates/order-types.js';

export function orderConfirmationTemplate(order: OrderEmailData): EmailTemplateResult {
  const currency = order.currency ?? 'LKR';
  const subject = `Order Confirmed — #${order.orderNumber}`;
  const text = `Hi ${order.name}, your order #${order.orderNumber} has been confirmed. Total: ${currency} ${order.total?.toFixed(2) ?? '0.00'}.`;
  const html = emailLayout(
    `${orderReference('Order', `#${order.orderNumber}`)}
     ${emailHeading('Your order is confirmed')}
     ${emailGreeting(order.name)}
     ${emailParagraph(`Thank you for your purchase. We're preparing your items and will notify you when they ship.`)}
     ${order.total !== undefined ? totalRow(currency, order.total) : ''}
     ${order.orderUrl ? ctaButton(order.orderUrl, 'View order') : ''}`,
    { title: 'Order Confirmed', preheader: `Order #${order.orderNumber} confirmed.` },
  );
  return { subject, html, text };
}
