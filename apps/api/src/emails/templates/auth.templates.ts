import {
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  infoTable,
  otpBlock,
} from '@/emails/layout.js';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(name: string): EmailTemplate {
  const subject = 'Welcome to Fashion Edge';
  const text = `Hi ${name}, welcome to Fashion Edge! Please verify your email to get started.`;
  const html = emailLayout(
    `${emailHeading(`Welcome, ${name}`)}
     ${emailParagraph(`We're delighted to have you at Fashion Edge — curated style for every day.`)}
     ${emailParagraph(`Complete your account setup by verifying your email address to unlock the full experience.`)}
     ${emailMuted(`Have questions? Reply to this email and our team will be happy to help.`)}`,
    {
      title: 'Welcome to Fashion Edge',
      preheader: `Welcome ${name}! Get started with Fashion Edge.`,
    },
  );
  return { subject, html, text };
}

export function verifyEmailTemplate(name: string, code: string): EmailTemplate {
  const subject = 'Your Fashion Edge verification code';
  const text = `Hi ${name}, your Fashion Edge verification code is: ${code}. It expires in 10 minutes.`;
  const html = emailLayout(
    `${emailHeading('Verify your email')}
     ${emailGreeting(name)}
     ${emailParagraph('Enter the verification code below to activate your Fashion Edge account and start shopping.')}
     ${otpBlock(code)}
     ${emailMuted(`This code expires in 10 minutes. If you didn't create an account, you can safely ignore this email.`)}`,
    { title: 'Verify your email', preheader: 'Your one-time verification code is ready.' },
  );
  return { subject, html, text };
}

export function forgotPasswordEmail(name: string, code: string): EmailTemplate {
  const subject = 'Your Fashion Edge password reset code';
  const text = `Hi ${name}, your Fashion Edge password reset code is: ${code}. It expires in 30 minutes.`;
  const html = emailLayout(
    `${emailHeading('Reset your password')}
     ${emailGreeting(name)}
     ${emailParagraph('We received a request to reset the password for your Fashion Edge account. Enter the code below to choose a new password.')}
     ${otpBlock(code)}
     ${emailMuted(`This code expires in 30 minutes. If you did not request a password reset, please ignore this email — your account is safe.`)}`,
    { title: 'Reset your password', preheader: 'Your password reset code is ready.' },
  );
  return { subject, html, text };
}

export function passwordChangedEmail(name: string): EmailTemplate {
  const subject = 'Your Fashion Edge password was changed';
  const text = `Hi ${name}, your password was changed successfully. If this was not you, contact support immediately.`;
  const html = emailLayout(
    `${emailHeading('Password changed')}
     ${emailGreeting(name)}
     ${emailParagraph('Your Fashion Edge account password was successfully changed.')}
     ${emailParagraph('<strong>If you did not make this change</strong>, please contact our support team immediately and reset your password.')}`,
    { title: 'Password changed', preheader: 'Your password was successfully updated.' },
  );
  return { subject, html, text };
}

export function loginAlertEmail(
  name: string,
  meta: { ip?: string; userAgent?: string },
): EmailTemplate {
  const subject = 'New login to your Fashion Edge account';
  const text = `Hi ${name}, a new login was detected. IP: ${meta.ip ?? 'unknown'}. Device: ${meta.userAgent ?? 'unknown'}.`;
  const html = emailLayout(
    `${emailHeading('New login detected')}
     ${emailGreeting(name)}
     ${emailParagraph('A new login to your Fashion Edge account was detected.')}
     ${infoTable([
       { label: 'IP address', value: meta.ip ?? 'Unknown' },
       { label: 'Device', value: meta.userAgent ?? 'Unknown' },
     ])}
     ${emailMuted('If this was not you, please reset your password and sign out of all devices immediately.')}`,
    { title: 'New login alert', preheader: 'A new login was detected on your account.' },
  );
  return { subject, html, text };
}
