# Email Service

> Transactional email via SMTP (Nodemailer) with a Mongo-backed retry queue.

## Configuration

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=yourgmail@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
FROM_NAME=Fashion Edge
SHOP_URL=http://localhost:5173
```

Email is enabled when `SMTP_HOST`, `EMAIL_FROM`, and `EMAIL_PASSWORD` are all set.

For Gmail: enable 2-Step Verification, then create an App Password at https://myaccount.google.com/apppasswords (use the 16-character password with no spaces).

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

All templates are in `apps/api/src/emails/templates/` and `apps/api/src/services/email/templates/`.

## Retry Queue

Failed sends are stored in the `email_logs` MongoDB collection. A sweep runs every 60 seconds from `apps/api/src/cron/index.ts`.

## Connection Verification

`verifyEmailTransporter()` calls `transporter.verify()` on API startup and is exposed via:

- `GET /api/v1/health/ready` — `checks.smtp.verified`
- `GET /api/v1/integrations/status` — `smtp.verified`

## Troubleshooting

| Issue                              | Cause                | Fix                                                         |
| ---------------------------------- | -------------------- | ----------------------------------------------------------- |
| Emails not sent, `noop-` messageId | SMTP not configured  | Set `SMTP_HOST`, `EMAIL_FROM`, `EMAIL_PASSWORD`             |
| `535 BadCredentials`               | Invalid app password | Regenerate Gmail App Password                               |
| `ECONNREFUSED`                     | Wrong host/port      | Gmail: `smtp.gmail.com:587`, `SMTP_SECURE=false`            |
| OTP not in inbox                   | Wrong mailbox        | Code goes to the **registered email**, not the SMTP account |
