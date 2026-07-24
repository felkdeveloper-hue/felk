import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  orderReference,
  type EmailTemplateResult,
} from '@/services/email/templates/layout';
import type { OrderEmailData } from '@/services/email/templates/order-types';

export function refundTemplate(order: OrderEmailData): EmailTemplateResult {
  const currency = order.currency ?? 'LKR';
  const amount = order.refundAmount ?? order.total ?? 0;
  const subject = `Refund processed — Order #${order.orderNumber}`;
  const text = `Hi ${order.name}, a refund of ${currency} ${amount.toFixed(2)} for order #${order.orderNumber} has been processed.`;
  const html = emailLayout(
    `${orderReference('Order', `#${order.orderNumber}`)}
     ${emailHeading('Refund processed')}
     ${emailGreeting(order.name)}
     ${emailParagraph(`We've processed a refund of <strong>${currency} ${amount.toFixed(2)}</strong> for your order.`)}
     ${emailMuted('Funds may take 5–7 business days to appear on your statement.')}
     ${order.orderUrl ? ctaButton(order.orderUrl, 'View order') : ''}`,
    { title: 'Refund Processed', preheader: `Refund for order #${order.orderNumber}.` },
  );
  return { subject, html, text };
}
