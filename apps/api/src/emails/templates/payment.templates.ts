import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  infoTable,
  orderReference,
} from '@/emails/layout';
import type { EmailTemplate } from './auth.templates';

export function paymentSuccessfulEmail(data: {
  name: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  method?: string;
  orderUrl?: string;
}): EmailTemplate {
  const currency = data.currency ?? 'LKR';
  const subject = `Payment Successful — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, your payment of ${currency} ${data.amount.toFixed(2)} for order #${data.orderNumber} was successful.`;
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Payment successful')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`We've successfully received your payment. Your order is now being prepared.`)}
     ${infoTable([
       { label: 'Order', value: `#${data.orderNumber}` },
       { label: 'Amount', value: `${currency} ${data.amount.toFixed(2)}` },
       ...(data.method ? [{ label: 'Method', value: data.method }] : []),
     ])}
     ${data.orderUrl ? ctaButton(data.orderUrl, 'View order') : ''}`,
    { title: 'Payment Successful', preheader: `Payment confirmed for order #${data.orderNumber}.` },
  );
  return { subject, html, text };
}

export function paymentFailedEmail(data: {
  name: string;
  orderNumber: string;
  amount?: number;
  currency?: string;
  reason?: string;
  retryUrl?: string;
}): EmailTemplate {
  const currency = data.currency ?? 'LKR';
  const subject = `Payment Failed — Order #${data.orderNumber}`;
  const text = `Hi ${data.name}, your payment for order #${data.orderNumber} was not successful. ${data.reason ?? ''}`;
  const html = emailLayout(
    `${orderReference('Order', `#${data.orderNumber}`)}
     ${emailHeading('Payment failed')}
     ${emailGreeting(data.name)}
     ${emailParagraph(`Unfortunately your payment for order <strong>#${data.orderNumber}</strong> was not completed.`)}
     ${infoTable([
       ...(data.amount !== undefined
         ? [{ label: 'Amount', value: `${currency} ${data.amount.toFixed(2)}` }]
         : []),
       ...(data.reason ? [{ label: 'Reason', value: data.reason }] : []),
     ])}
     ${emailParagraph('Your cart and order have been preserved. You can retry your payment at any time.')}
     ${data.retryUrl ? ctaButton(data.retryUrl, 'Retry payment') : ''}
     ${emailMuted('If you continue to have issues, please contact our support team.')}`,
    {
      title: 'Payment Failed',
      preheader: `Payment for order #${data.orderNumber} was not successful.`,
    },
  );
  return { subject, html, text };
}
