import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  orderReference,
  type EmailTemplateResult,
} from '@/services/email/templates/layout.js';
import type { OrderEmailData } from '@/services/email/templates/order-types.js';

export function orderCancelledTemplate(order: OrderEmailData): EmailTemplateResult {
  const subject = `Order Cancelled — #${order.orderNumber}`;
  const text = `Hi ${order.name}, your order #${order.orderNumber} has been cancelled.`;
  const html = emailLayout(
    `${orderReference('Order', `#${order.orderNumber}`)}
     ${emailHeading('Order cancelled')}
     ${emailGreeting(order.name)}
     ${emailParagraph(`Your order <strong>#${order.orderNumber}</strong> has been cancelled.`)}
     ${order.reason ? emailParagraph(`<strong>Reason:</strong> ${order.reason}`) : ''}
     ${emailMuted('If any payment was taken, it will be refunded within 5–7 business days.')}
     ${order.orderUrl ? ctaButton(order.orderUrl, 'View order') : ''}`,
    { title: 'Order Cancelled', preheader: `Order #${order.orderNumber} was cancelled.` },
  );
  return { subject, html, text };
}
