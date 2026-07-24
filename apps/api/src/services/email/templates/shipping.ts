import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailParagraph,
  infoTable,
  orderReference,
  type EmailTemplateResult,
} from '@/services/email/templates/layout';
import type { OrderEmailData } from '@/services/email/templates/order-types';

export function shippingTemplate(order: OrderEmailData): EmailTemplateResult {
  const subject = `Your order #${order.orderNumber} has shipped`;
  const text = `Hi ${order.name}, your order #${order.orderNumber} has shipped. Tracking: ${order.trackingNumber ?? 'N/A'}.`;
  const rows = [
    ...(order.carrier ? [{ label: 'Carrier', value: order.carrier }] : []),
    ...(order.trackingNumber ? [{ label: 'Tracking', value: order.trackingNumber }] : []),
  ];
  const html = emailLayout(
    `${orderReference('Order', `#${order.orderNumber}`)}
     ${emailHeading('Your order is on its way')}
     ${emailGreeting(order.name)}
     ${emailParagraph(`Great news — your order has shipped and is heading to you.`)}
     ${rows.length > 0 ? infoTable(rows) : ''}
     ${order.trackingUrl ? ctaButton(order.trackingUrl, 'Track shipment') : ''}`,
    { title: 'Order Shipped', preheader: `Order #${order.orderNumber} is on its way.` },
  );
  return { subject, html, text };
}
