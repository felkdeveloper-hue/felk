import {
  ctaButton,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  type EmailTemplateResult,
} from '@/services/email/templates/layout.js';

export interface WelcomeUser {
  email: string;
  firstName: string;
  shopUrl?: string;
}

export function welcomeTemplate(user: WelcomeUser): EmailTemplateResult {
  const shopUrl = user.shopUrl ?? process.env.SHOP_URL ?? 'https://fashionedge.lk';
  const subject = 'Welcome to Fashion Edge';
  const text = `Hi ${user.firstName}, welcome to Fashion Edge! Visit ${shopUrl} to start shopping.`;
  const html = emailLayout(
    `${emailHeading(`Welcome, ${user.firstName}`)}
     ${emailParagraph(`We're delighted to have you at Fashion Edge — curated style for every day, delivered with care.`)}
     ${emailParagraph(`Your account is ready. Explore new arrivals, save your favourites, and enjoy a seamless shopping experience.`)}
     ${ctaButton(shopUrl, 'Start shopping')}
     ${emailMuted(`You received this email because you created an account at Fashion Edge.`)}`,
    { title: subject, preheader: `Welcome to Fashion Edge, ${user.firstName}.` },
  );
  return { subject, html, text };
}
