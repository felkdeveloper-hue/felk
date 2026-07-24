const BRAND_NAME = 'Fashion Edge';
const BRAND_TAGLINE = 'Modern fashion for every day';
const BRAND_COLOR = '#0a0a0a';
const TEXT_COLOR = '#1f2937';
const MUTED_COLOR = '#6b7280';
const BG_COLOR = '#f4f4f5';
const CARD_BG = '#ffffff';
const BORDER_COLOR = '#e5e7eb';
const ACCENT_COLOR = '#0a0a0a';
const SUPPORT_EMAIL = 'support@fashionedge.lk';
const SHOP_URL = process.env.SHOP_URL ?? 'https://fashionedge.lk';

export interface EmailTemplateResult {
  subject: string;
  html: string;
  text: string;
}

export interface LayoutOptions {
  preheader?: string;
  title: string;
  footerText?: string;
}

export function emailHeading(text: string): string {
  return `<h2 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.25;color:${BRAND_COLOR};font-family:Georgia,'Times New Roman',Times,serif;">${text}</h2>`;
}

export function emailEyebrow(text: string): string {
  return `<p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED_COLOR};">${text}</p>`;
}

export function emailGreeting(name: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${TEXT_COLOR};">Hi ${name},</p>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:${TEXT_COLOR};">${text}</p>`;
}

export function emailMuted(text: string): string {
  return `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${MUTED_COLOR};">${text}</p>`;
}

export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:32px auto 8px;">
    <tr>
      <td style="background-color:${ACCENT_COLOR};border-radius:2px;">
        <a href="${href}" style="display:inline-block;padding:15px 40px;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function otpBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background-color:#fafafa;border:1px solid ${BORDER_COLOR};">
    <tr>
      <td style="padding:28px 20px;text-align:center;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED_COLOR};">Verification code</p>
        <span class="otp-code" style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:0.35em;color:${BRAND_COLOR};font-family:'SF Mono',Monaco,Consolas,'Courier New',monospace;">${code}</span>
      </td>
    </tr>
  </table>`;
}

export function orderReference(label: string, value: string): string {
  return emailEyebrow(`${label} ${value}`);
}

export function totalRow(currency: string, amount: number): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${BORDER_COLOR};">
    <tr>
      <td style="padding-top:18px;text-align:right;">
        <span style="font-size:13px;color:${MUTED_COLOR};margin-right:10px;">Total</span>
        <span style="font-size:20px;font-weight:600;color:${BRAND_COLOR};font-family:Georgia,'Times New Roman',Times,serif;">${currency} ${amount.toFixed(2)}</span>
      </td>
    </tr>
  </table>`;
}

export function infoTable(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (row) => `<tr>
        <td style="padding:12px 14px;border-bottom:1px solid ${BORDER_COLOR};font-size:13px;font-weight:600;color:${MUTED_COLOR};width:35%;">${row.label}</td>
        <td style="padding:12px 14px;border-bottom:1px solid ${BORDER_COLOR};font-size:14px;color:${TEXT_COLOR};">${row.value}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER_COLOR};">${cells}</table>`;
}

export function emailLayout(content: string, opts: LayoutOptions): string {
  const preheader = opts.preheader ?? '';
  const footerLine =
    opts.footerText ?? `&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${opts.title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-shell { padding: 16px 12px !important; }
      .email-header { padding: 28px 20px !important; }
      .email-card { padding: 28px 20px !important; }
      .email-footer { padding: 24px 20px !important; }
      .brand-name { font-size: 24px !important; }
      .otp-code { font-size: 28px !important; letter-spacing: 0.25em !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</span>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-shell" style="background-color:${BG_COLOR};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
          <tr>
            <td class="email-header" style="background-color:${BRAND_COLOR};padding:36px 40px;text-align:center;border-radius:2px 2px 0 0;">
              <p class="brand-name" style="margin:0;font-family:Georgia,'Times New Roman',Times,serif;font-size:30px;font-weight:400;letter-spacing:0.04em;color:#ffffff;">${BRAND_NAME}</p>
              <p style="margin:10px 0 0;font-size:10px;font-weight:500;letter-spacing:0.22em;text-transform:uppercase;color:#9ca3af;">${BRAND_TAGLINE}</p>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="background-color:${CARD_BG};padding:40px;border-left:1px solid ${BORDER_COLOR};border-right:1px solid ${BORDER_COLOR};">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="background-color:${BRAND_COLOR};padding:28px 40px;text-align:center;border-radius:0 0 2px 2px;">
              <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;line-height:1.6;">${footerLine}</p>
              <p style="margin:0 0 14px;color:#6b7280;font-size:12px;">
                Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#ffffff;text-decoration:underline;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#6b7280;">
                <a href="${SHOP_URL}" style="color:#9ca3af;text-decoration:none;margin:0 8px;">Shop</a>
                <span style="color:#4b5563;">|</span>
                <a href="${SHOP_URL}/contact" style="color:#9ca3af;text-decoration:none;margin:0 8px;">Contact</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { TEXT_COLOR, MUTED_COLOR, ACCENT_COLOR, SUPPORT_EMAIL };
