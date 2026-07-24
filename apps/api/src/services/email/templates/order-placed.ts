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

export function orderPlacedTemplate(order: OrderEmailData): EmailTemplateResult {
  const currency = order.currency ?? 'LKR';
  const subject = `Order Received — #${order.orderNumber}`;
  const text = `Hi ${order.name}, we received your order #${order.orderNumber}. Total: ${currency} ${order.total?.toFixed(2) ?? '0.00'}.`;
  const html = emailLayout(
    `${orderReference('Order', `#${order.orderNumber}`)}
     ${emailHeading('Thank you for your order')}
     ${emailGreeting(order.name)}
     ${emailParagraph(`We've received your order and will send a confirmation once payment is verified.`)}
     ${order.total !== undefined ? totalRow(currency, order.total) : ''}
     ${order.orderUrl ? ctaButton(order.orderUrl, 'View order') : ''}`,
    { title: 'Order Placed', preheader: `Order #${order.orderNumber} received.` },
  );
  return { subject, html, text };
}
