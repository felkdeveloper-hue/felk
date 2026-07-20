# Email Service

> Transactional email via Zoho SMTP (Nodemailer) with a Mongo-backed retry queue.

## Configuration

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_SECURE=true            # auto-derived as true when PORT=465
SMTP_USER=your@zoho-email.com
SMTP_PASS=your_app_password
EMAIL_FROM="Fashion Edge <system@technixinc.com>"
FROM_EMAIL=system@technixinc.com
FROM_NAME=Fashion Edge
```

`SMTP_ENABLED` defaults to `true` when `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are all set. Set `SMTP_ENABLED=false` to disable sending in non-production environments.

## Sending Emails

### Direct send (existing flows)

`emailService` implements the `EmailService` interface. Existing call sites in `auth.service.ts` work unchanged:

```typescript
await emailService.send({ to, subject, html, text });
```

### Queued send (new flows — recommended for transactional emails)

```typescript
import { emailQueueService } from '@/services/email-queue.service';
import { orderConfirmationEmail } from '@/emails';

const tpl = orderConfirmationEmail({ name, orderNumber, lines, total, currency, orderUrl });
await emailQueueService.enqueue({ ...tpl, to: customer.email, templateKey: 'order_confirmation' });
```

The queue writes a log record, attempts immediate send, and falls back to a retry sweep on failure.

## Templates

All templates are in `apps/api/src/emails/templates/`.

| File                     | Templates                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `auth.templates.ts`      | `welcomeEmail`, `verifyEmailTemplate`, `forgotPasswordEmail`, `passwordChangedEmail`, `loginAlertEmail`                |
| `order.templates.ts`     | `orderConfirmationEmail`, `orderCancelledEmail`, `returnRequestedEmail`, `returnApprovedEmail`, `refundProcessedEmail` |
| `payment.templates.ts`   | `paymentSuccessfulEmail`, `paymentFailedEmail`                                                                         |
| `marketing.templates.ts` | `newsletterEmail`                                                                                                      |
| `admin.templates.ts`     | `lowStockAlertEmail`, `newOrderAlertEmail`                                                                             |

### Layout

All templates use the shared `apps/api/src/emails/layout.ts` layout — responsive, dark-mode compatible, with brand header, CTA button helper, and social footer.

## Retry Queue

Failed sends are stored in the `email_logs` MongoDB collection:

```
status: 'pending' | 'sent' | 'failed' | 'retrying'
attempts: number
maxAttempts: number (default 3)
nextAttemptAt: Date (exponential backoff)
```

A sweep runs every 60 seconds from `apps/api/src/cron/index.ts`.

## Connection Verification

`emailService.verifyConnection()` calls `transporter.verify()`. This is called by:

- `GET /api/v1/health/ready` — `checks.smtp.verified`
- `GET /api/v1/integrations/status` — `smtp.verified`

## Zoho SMTP Setup

1. Log in to **Zoho Mail**.
2. Go to **Settings → Mail Accounts → SMTP** and enable SMTP access.
3. If 2FA is enabled, generate an **App Password** for SMTP.
4. Use `SMTP_PORT=465` with `SMTP_SECURE=true` (SSL) — Zoho recommends this over 587/TLS for reliability.

## Production Setup

1. Verify the sending domain in Zoho (SPF, DKIM, DMARC records).
2. Use a dedicated transactional sender address (`FROM_EMAIL`).
3. Set all five SMTP env vars.
4. Confirm `SMTP_ENABLED=true`.
5. Check `GET /api/v1/health/ready` → `checks.smtp.verified: true`.

## Troubleshooting

| Issue                              | Cause                           | Fix                                               |
| ---------------------------------- | ------------------------------- | ------------------------------------------------- |
| Emails not sent, `noop-` messageId | SMTP disabled or not configured | Set all SMTP vars + `SMTP_ENABLED=true`           |
| `ECONNREFUSED`                     | Wrong host/port                 | Verify `SMTP_HOST=smtp.zoho.com`, `SMTP_PORT=465` |
| Authentication failed              | Wrong credentials               | Use App Password if 2FA enabled                   |
| Emails in retry queue              | Transient network error         | Check `email_logs` collection, monitor cron sweep |
| `self-signed certificate`          | TLS issue                       | Set `SMTP_SECURE=true` for port 465               |
