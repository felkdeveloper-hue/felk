import { emailLayout, ctaButton } from '@/emails/layout';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(name: string): EmailTemplate {
  const subject = 'Welcome to Fashion Edge';
  const text = `Hi ${name}, welcome to Fashion Edge! Please verify your email to get started.`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Welcome, ${name}!</h2>
     <p>We're thrilled to have you on board. Fashion Edge is your destination for the latest in premium fashion.</p>
     <p>Complete your account setup by verifying your email address to unlock the full experience.</p>
     <p style="margin-top:24px;">Have questions? Reply to this email and our team will be happy to help.</p>`,
    {
      title: 'Welcome to Fashion Edge',
      preheader: `Welcome ${name}! Get started with Fashion Edge.`,
    },
  );
  return { subject, html, text };
}

export function verifyEmailTemplate(name: string, verifyUrl: string): EmailTemplate {
  const subject = 'Verify your Fashion Edge email';
  const text = `Hi ${name}, verify your email: ${verifyUrl}`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Verify your email</h2>
     <p>Hi ${name},</p>
     <p>Please verify your email address to activate your Fashion Edge account and start shopping.</p>
     <p style="margin:24px 0;">${ctaButton(verifyUrl, 'Verify Email')}</p>
     <p style="font-size:13px;color:#777777;">Or copy this link into your browser:<br/>
     <a href="${verifyUrl}" style="color:#e94560;word-break:break-all;">${verifyUrl}</a></p>
     <p style="font-size:12px;color:#999999;margin-top:24px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>`,
    { title: 'Verify your email', preheader: 'Action required: verify your email address.' },
  );
  return { subject, html, text };
}

export function forgotPasswordEmail(name: string, resetUrl: string): EmailTemplate {
  const subject = 'Reset your Fashion Edge password';
  const text = `Hi ${name}, reset your password: ${resetUrl}`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Reset your password</h2>
     <p>Hi ${name},</p>
     <p>We received a request to reset the password for your Fashion Edge account. Click the button below to choose a new password.</p>
     <p style="margin:24px 0;">${ctaButton(resetUrl, 'Reset Password')}</p>
     <p style="font-size:13px;color:#777777;">Or copy this link:<br/>
     <a href="${resetUrl}" style="color:#e94560;word-break:break-all;">${resetUrl}</a></p>
     <p style="font-size:12px;color:#999999;margin-top:24px;">This link expires in 30 minutes. If you did not request a password reset, please ignore this email — your account is safe.</p>`,
    { title: 'Reset your password', preheader: 'Password reset request for your account.' },
  );
  return { subject, html, text };
}

export function passwordChangedEmail(name: string): EmailTemplate {
  const subject = 'Your Fashion Edge password was changed';
  const text = `Hi ${name}, your password was changed successfully. If this was not you, contact support immediately.`;
  const html = emailLayout(
    `<h2 style="margin:0 0 16px;font-size:20px;">Password changed</h2>
     <p>Hi ${name},</p>
     <p>Your Fashion Edge account password was successfully changed.</p>
     <p><strong>If you did not make this change</strong>, please contact our support team immediately and reset your password.</p>`,
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
    `<h2 style="margin:0 0 16px;font-size:20px;">New login detected</h2>
     <p>Hi ${name},</p>
     <p>A new login to your Fashion Edge account was detected.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:8px;border:1px solid #e8e8e8;font-weight:600;">IP Address</td><td style="padding:8px;border:1px solid #e8e8e8;">${meta.ip ?? 'Unknown'}</td></tr>
       <tr><td style="padding:8px;border:1px solid #e8e8e8;font-weight:600;">Device</td><td style="padding:8px;border:1px solid #e8e8e8;">${meta.userAgent ?? 'Unknown'}</td></tr>
     </table>
     <p>If this was not you, please reset your password and sign out of all devices immediately.</p>`,
    { title: 'New login alert', preheader: 'A new login was detected on your account.' },
  );
  return { subject, html, text };
}
