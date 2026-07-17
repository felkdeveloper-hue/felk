export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f6f6;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
    <tr><td>
      <h1 style="margin:0 0 16px;font-size:20px;color:#111;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#888;">FE Platform — do not reply to this email.</p>
    </td></tr>
  </table>
</body></html>`;
}

export function welcomeEmail(name: string): EmailTemplate {
  const subject = 'Welcome to FE Platform';
  const text = `Hi ${name}, welcome to FE Platform. Please verify your email to get started.`;
  const html = layout(
    'Welcome',
    `<p>Hi ${name},</p><p>Welcome to FE Platform. Please verify your email address to activate your account.</p>`,
  );
  return { subject, html, text };
}

export function verifyEmailTemplate(name: string, verifyUrl: string): EmailTemplate {
  const subject = 'Verify your email';
  const text = `Hi ${name}, verify your email: ${verifyUrl}`;
  const html = layout(
    'Verify your email',
    `<p>Hi ${name},</p><p>Please verify your email address:</p>
     <p><a href="${verifyUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Verify email</a></p>
     <p style="font-size:12px;color:#666;">Or copy: ${verifyUrl}</p>`,
  );
  return { subject, html, text };
}

export function forgotPasswordEmail(name: string, resetUrl: string): EmailTemplate {
  const subject = 'Reset your password';
  const text = `Hi ${name}, reset your password: ${resetUrl}`;
  const html = layout(
    'Reset your password',
    `<p>Hi ${name},</p><p>We received a request to reset your password.</p>
     <p><a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">Reset password</a></p>
     <p style="font-size:12px;color:#666;">This link expires soon. If you did not request this, ignore this email.</p>`,
  );
  return { subject, html, text };
}

export function passwordChangedEmail(name: string): EmailTemplate {
  const subject = 'Your password was changed';
  const text = `Hi ${name}, your password was changed successfully. If this was not you, contact support immediately.`;
  const html = layout(
    'Password changed',
    `<p>Hi ${name},</p><p>Your password was changed successfully.</p><p>If you did not make this change, contact support immediately.</p>`,
  );
  return { subject, html, text };
}

export function loginAlertEmail(
  name: string,
  meta: { ip?: string; userAgent?: string },
): EmailTemplate {
  const subject = 'New login to your account';
  const text = `Hi ${name}, a new login was detected. IP: ${meta.ip ?? 'unknown'}. Device: ${meta.userAgent ?? 'unknown'}.`;
  const html = layout(
    'New login alert',
    `<p>Hi ${name},</p><p>A new login to your account was detected.</p>
     <ul>
       <li>IP: ${meta.ip ?? 'unknown'}</li>
       <li>Device: ${meta.userAgent ?? 'unknown'}</li>
     </ul>
     <p>If this was not you, reset your password and logout all devices.</p>`,
  );
  return { subject, html, text };
}
