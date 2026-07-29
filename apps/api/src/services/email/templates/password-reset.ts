import {
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  otpBlock,
  type EmailTemplateResult,
} from '@/services/email/templates/layout.js';

export function passwordResetTemplate(
  name: string,
  token: string,
  expiryMinutes = 30,
): EmailTemplateResult {
  const subject = 'Your Fashion Edge password reset code';
  const text = `Hi ${name}, your password reset code is ${token}. It expires in ${expiryMinutes} minutes.`;
  const html = emailLayout(
    `${emailHeading('Reset your password')}
     ${emailGreeting(name)}
     ${emailParagraph('We received a request to reset your Fashion Edge password. Enter the code below to choose a new password.')}
     ${otpBlock(token)}
     ${emailMuted(`This code expires in ${expiryMinutes} minutes. If you did not request a reset, ignore this email — your account remains secure.`)}`,
    { title: 'Reset your password', preheader: 'Your password reset code is ready.' },
  );
  return { subject, html, text };
}
