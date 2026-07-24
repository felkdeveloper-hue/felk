import { ctaButton, emailGreeting, emailHeading, emailLayout } from '@/emails/layout';
import type { EmailTemplate } from './auth.templates';

export function newsletterEmail(data: {
  name?: string;
  subject: string;
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): EmailTemplate {
  const greeting = data.name ? emailGreeting(data.name) : '';
  const cta = data.ctaLabel && data.ctaUrl ? ctaButton(data.ctaUrl, data.ctaLabel) : '';
  const html = emailLayout(
    `${emailHeading(data.headline)}
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
