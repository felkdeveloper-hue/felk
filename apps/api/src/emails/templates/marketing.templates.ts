import { emailLayout, ctaButton } from '@/emails/layout';
import type { EmailTemplate } from './auth.templates';

export function newsletterEmail(data: {
  name?: string;
  subject: string;
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): EmailTemplate {
  const greeting = data.name ? `<p>Hi ${data.name},</p>` : '';
  const cta =
    data.ctaLabel && data.ctaUrl
      ? `<p style="margin:24px 0;">${ctaButton(data.ctaUrl, data.ctaLabel)}</p>`
      : '';
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;color:#1a1a2e;">${data.headline}</h2>
     ${greeting}
     ${data.bodyHtml}
     ${cta}`,
    { title: data.subject, preheader: data.headline },
  );
  return {
    subject: data.subject,
    html,
    text: `${data.headline}\n\n${data.bodyHtml.replace(/<[^>]+>/g, '')}`,
  };
}
