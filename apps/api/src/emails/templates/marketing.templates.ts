import {
  ctaButton,
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
} from '@/emails/layout.js';
import type { EmailTemplate } from './auth.templates.js';

const DEFAULT_SHOP_URL = process.env.SHOP_URL ?? 'https://fe.lk';

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

/** Apology email for users who hit checkout but could not get the offer price at payment. */
export function checkoutApologyEmail(data: { name?: string; shopUrl?: string }): EmailTemplate {
  const shopUrl = data.shopUrl ?? DEFAULT_SHOP_URL;
  const greeting = data.name ? emailGreeting(data.name) : '';
  const subject = 'We’re sorry — your 20% off is waiting for you';
  const headline = 'We owe you an apology';
  const bodyHtml = [
    emailParagraph(
      'We noticed you tried to checkout today, and we’re truly sorry — there was a small bug on our side that prevented the special <strong>20% off offer</strong> from applying correctly at payment.',
    ),
    emailParagraph(
      'That was our mistake, not yours. We’ve fixed the issue, and we want to make it right.',
    ),
    emailParagraph(
      'The next time you visit Fashion Edge and sign in, your <strong>20% off</strong> will be activated again automatically — so you can shop with the price you were meant to get.',
    ),
    emailMuted(
      'Thank you for your patience and for giving us another chance. We genuinely appreciate you.',
    ),
  ].join('');
  const html = emailLayout(
    `${emailHeading(headline)}${greeting}${bodyHtml}${ctaButton(shopUrl, 'Return & shop with 20% off')}`,
    { title: subject, preheader: 'Your 20% off is restored — we’re sorry for the trouble.' },
  );
  const text = [
    headline,
    '',
    'We noticed you tried to checkout today, and we’re truly sorry — there was a small bug on our side that prevented the special 20% off offer from applying correctly at payment.',
    '',
    'That was our mistake, not yours. We’ve fixed the issue, and we want to make it right.',
    '',
    'The next time you visit Fashion Edge and sign in, your 20% off will be activated again automatically.',
    '',
    `Return to shop: ${shopUrl}`,
  ].join('\n');
  return { subject, html, text };
}

/** Promotional email announcing site-wide 20% off for general audience. */
export function siteWideOfferEmail(data: { name?: string; shopUrl?: string }): EmailTemplate {
  const shopUrl = data.shopUrl ?? DEFAULT_SHOP_URL;
  const greeting = data.name ? emailGreeting(data.name) : '';
  const subject = '20% off everything — now live on Fashion Edge';
  const headline = '20% off all products';
  const bodyHtml = [
    emailParagraph(
      'Great news — we’ve just started a <strong>20% off sale</strong> across our entire website. Every product is included, so now is the perfect time to refresh your wardrobe.',
    ),
    emailParagraph(
      'Sign in, browse your favourites, and enjoy exclusive member pricing for a limited time.',
    ),
  ].join('');
  const html = emailLayout(
    `${emailHeading(headline)}${greeting}${bodyHtml}${ctaButton(shopUrl, 'Shop 20% off now')}`,
    { title: subject, preheader: '20% off everything — shop the full collection today.' },
  );
  const text = [
    headline,
    '',
    'We’ve just started a 20% off sale across our entire website. Every product is included.',
    '',
    `Shop now: ${shopUrl}`,
  ].join('\n');
  return { subject, html, text };
}

/** Urgent personal flash-sale reminder — N minutes remaining. */
export function flashSaleMinutesLeftEmail(data: {
  name?: string;
  minutesLeft?: number;
  shopUrl?: string;
}): EmailTemplate {
  const shopUrl = data.shopUrl ?? DEFAULT_SHOP_URL;
  const minutes = data.minutesLeft ?? 20;
  const greeting = data.name ? emailGreeting(data.name) : '';
  const subject = `Only ${minutes} minutes left — your 20% off is about to expire`;
  const headline = `${minutes} minutes left on your 20% off`;
  const bodyHtml = [
    emailParagraph(
      `This is a personal reminder from Fashion Edge: your member <strong>20% off</strong> on every eligible product has just <strong>${minutes} minutes</strong> remaining.`,
    ),
    emailParagraph(
      'Sign in now to lock in your discount before the timer runs out — once it expires, this window closes.',
    ),
    emailMuted(
      'This offer applies to your account only while the countdown is active. Shoes are excluded from the extra 20% off.',
    ),
  ].join('');
  const html = emailLayout(
    `${emailHeading(headline)}${greeting}${bodyHtml}${ctaButton(shopUrl, 'Shop with 20% off now')}`,
    {
      title: subject,
      preheader: `Your 20% off ends in ${minutes} minutes — shop before it expires.`,
    },
  );
  const text = [
    headline,
    '',
    `Your member 20% off on every eligible product has just ${minutes} minutes remaining.`,
    '',
    'Sign in now to lock in your discount before the timer runs out.',
    '',
    `Shop now: ${shopUrl}`,
  ].join('\n');
  return { subject, html, text };
}
