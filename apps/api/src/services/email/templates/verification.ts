import {
  emailGreeting,
  emailHeading,
  emailLayout,
  emailMuted,
  emailParagraph,
  otpBlock,
  type EmailTemplateResult,
} from '@/services/email/templates/layout';

export function verificationTemplate(
  name: string,
  otp: string,
  expiryMinutes = 10,
): EmailTemplateResult {
  const subject = 'Your Fashion Edge verification code';
  const text = `Hi ${name}, your verification code is ${otp}. It expires in ${expiryMinutes} minutes.`;
  const html = emailLayout(
    `${emailHeading('Verify your email')}
     ${emailGreeting(name)}
     ${emailParagraph('Enter the verification code below to activate your Fashion Edge account and start shopping.')}
     ${otpBlock(otp)}
     ${emailMuted(`This code expires in ${expiryMinutes} minutes. If you didn't create an account, you can safely ignore this email.`)}`,
    { title: 'Verify your email', preheader: 'Your one-time verification code is ready.' },
  );
  return { subject, html, text };
}
