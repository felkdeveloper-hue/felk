import { emailLayout, type EmailTemplateResult } from '@/services/email/templates/layout';

export function newsletterTemplate(subject: string, htmlContent: string): EmailTemplateResult {
  const text = htmlContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const html = emailLayout(htmlContent, {
    title: subject,
    preheader: subject,
  });
  return { subject, html, text };
}
