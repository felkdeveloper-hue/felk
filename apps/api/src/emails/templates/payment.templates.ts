import { emailLayout, ctaButton } from '@/emails/layout';
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
    `<h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">Payment Successful</h2>
     <p>Hi ${data.name},</p>
     <p>We've successfully received your payment. Your order is now being prepared.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Order</td><td style="padding:8px;border:1px solid #eeeeee;">#${data.orderNumber}</td></tr>
       <tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Amount</td><td style="padding:8px;border:1px solid #eeeeee;color:#e94560;font-weight:700;">${currency} ${data.amount.toFixed(2)}</td></tr>
       ${data.method ? `<tr><td style="padding:8px;border:1px solid #eeeeee;font-weight:600;">Method</td><td style="padding:8px;border:1px solid #eeeeee;">${data.method}</td></tr>` : ''}
     </table>
     ${data.orderUrl ? `<p style="margin:24px 0;">${ctaButton(data.orderUrl, 'View Order')}</p>` : ''}`,
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
    `<h2 style="margin:0 0 16px;font-size:20px;">Payment Failed</h2>
     <p>Hi ${data.name},</p>
     <p>Unfortunately your payment for order <strong>#${data.orderNumber}</strong> was not completed.</p>
     ${data.amount !== undefined ? `<p><strong>Amount:</strong> ${currency} ${data.amount.toFixed(2)}</p>` : ''}
     ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
     <p>Your cart and order have been preserved. You can retry your payment at any time.</p>
     ${data.retryUrl ? `<p style="margin:24px 0;">${ctaButton(data.retryUrl, 'Retry Payment')}</p>` : ''}
     <p>If you continue to have issues, please contact our support team.</p>`,
    {
      title: 'Payment Failed',
      preheader: `Payment for order #${data.orderNumber} was not successful.`,
    },
  );
  return { subject, html, text };
}
