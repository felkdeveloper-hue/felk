# Mintpay Integration

> BNPL (Buy Now Pay Later) gateway with sandbox/live mode switching.

## Configuration

```env
MINTPAY_MERCHANT_ID=your_merchant_id
MINTPAY_MERCHANT_SECRET=your_secret       # used for API call + webhook HMAC
MINTPAY_MODE=sandbox                      # sandbox | live
```

`MINTPAY_SECRET_KEY` is a legacy alias for `MINTPAY_MERCHANT_SECRET` — both are supported.

## How It Works

### With credentials configured

1. Server POSTs to Mintpay's checkout session API (`sandbox.api.mintpay.lk` or `api.mintpay.lk`).
2. Request body is HMAC-SHA256 signed with `MINTPAY_MERCHANT_SECRET`.
3. Mintpay returns a `checkoutUrl`/`sessionId`.
4. Customer is redirected to Mintpay-hosted checkout.
5. Mintpay POSTs a webhook to `POST /api/v1/payments/webhooks/mintpay`.

### Fallback mode

If the secret key is the dev default or API call fails, the gateway falls back to a deterministic redirect URL.

## Mode Switching

| `MINTPAY_MODE` | API Base                            | Checkout Base                             |
| -------------- | ----------------------------------- | ----------------------------------------- |
| `sandbox`      | `https://sandbox.api.mintpay.lk/v1` | `https://sandbox.checkout.mintpay.lk/pay` |
| `live`         | `https://api.mintpay.lk/v1`         | `https://checkout.mintpay.lk/pay`         |

## Webhook

Mintpay calls `POST /api/v1/payments/webhooks/mintpay`.

Verification: `HMAC-SHA256(secret_key, raw_body)` must equal `X-Mintpay-Signature` header.

Status mapping:

| Mintpay status        | Platform status |
| --------------------- | --------------- |
| `success` / `paid`    | `paid`          |
| `pending`             | `processing`    |
| `rejected` / `failed` | `failed`        |
| `cancelled`           | `cancelled`     |
| `expired`             | `expired`       |

## Sandbox Setup

1. Register at Mintpay sandbox portal and obtain credentials.
2. Set `MINTPAY_MODE=sandbox`, `MINTPAY_MERCHANT_ID`, `MINTPAY_MERCHANT_SECRET`.
3. Use ngrok for local webhook testing.

## Production Setup

1. Complete Mintpay KYC and obtain live credentials.
2. Set `MINTPAY_MODE=live`.
3. Configure webhook URL in Mintpay dashboard: `https://yourdomain.com/api/v1/payments/webhooks/mintpay`.
4. Set `PRODUCTION_STRICT=true` to block dev defaults.

## Troubleshooting

| Issue                           | Cause                 | Fix                                       |
| ------------------------------- | --------------------- | ----------------------------------------- |
| Fallback redirect in production | Secret is dev default | Set `MINTPAY_MERCHANT_SECRET`             |
| Webhook `invalid_signature`     | Key mismatch          | Verify key in Mintpay dashboard           |
| Wrong checkout URLs             | Mode set incorrectly  | Verify `MINTPAY_MODE=live` for production |
