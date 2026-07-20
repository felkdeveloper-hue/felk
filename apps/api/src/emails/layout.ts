const BRAND_COLOR = '#1a1a2e';
const ACCENT_COLOR = '#e94560';
const TEXT_COLOR = '#333333';
const MUTED_COLOR = '#777777';
const BG_COLOR = '#f4f4f7';
const CARD_BG = '#ffffff';

export interface LayoutOptions {
  preheader?: string;
  title: string;
  footerText?: string;
}

export function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:${ACCENT_COLOR};color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:0.3px;">${label}</a>`;
}

export function emailLayout(content: string, opts: LayoutOptions): string {
  const preheader = opts.preheader ?? '';
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="color-scheme" content="light dark"/>
  <meta name="supported-color-schemes" content="light dark"/>
  <title>${opts.title}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a1a !important; }
      .email-wrapper { background-color: #1a1a1a !important; }
      .email-card { background-color: #2d2d2d !important; }
      .email-body-text { color: #e0e0e0 !important; }
      .email-muted { color: #aaaaaa !important; }
      .email-footer { color: #888888 !important; }
      .email-divider { border-color: #444444 !important; }
    }
    @media only screen and (max-width: 600px) {
      .email-card { padding: 24px 16px !important; }
      .email-header { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</span>` : ''}
  <table class="email-wrapper" role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${BG_COLOR};padding:32px 0;">
    <tr>
      <td align="center">
        <!-- Header -->
        <table class="email-header" role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:${BRAND_COLOR};border-radius:8px 8px 0 0;padding:24px 32px;">
          <tr>
            <td>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">
                Fashion Edge
              </h1>
            </td>
          </tr>
        </table>
        <!-- Card -->
        <table class="email-card" role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:${CARD_BG};padding:32px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
          <tr>
            <td class="email-body-text" style="color:${TEXT_COLOR};font-size:15px;line-height:1.7;">
              ${content}
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:${BRAND_COLOR};border-radius:0 0 8px 8px;padding:20px 32px;">
          <tr>
            <td>
              <p class="email-footer" style="margin:0 0 8px;color:#aaaaaa;font-size:12px;text-align:center;">
                ${opts.footerText ?? '&copy; 2025 Fashion Edge. All rights reserved.'}
              </p>
              <p style="margin:0;text-align:center;">
                <a href="#" style="color:#aaaaaa;font-size:11px;text-decoration:underline;margin:0 8px;">Unsubscribe</a>
                <a href="#" style="color:#aaaaaa;font-size:11px;text-decoration:underline;margin:0 8px;">Privacy Policy</a>
                <a href="#" style="color:#aaaaaa;font-size:11px;text-decoration:underline;margin:0 8px;">Terms</a>
              </p>
              <p style="margin:8px 0 0;text-align:center;color:#666666;font-size:11px;">
                Follow us:
                <a href="#" style="color:${ACCENT_COLOR};margin:0 4px;">Instagram</a>
                <a href="#" style="color:${ACCENT_COLOR};margin:0 4px;">Facebook</a>
                <a href="#" style="color:${ACCENT_COLOR};margin:0 4px;">TikTok</a>
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

export { TEXT_COLOR, MUTED_COLOR, ACCENT_COLOR };
