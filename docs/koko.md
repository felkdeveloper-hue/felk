# Koko Integration

> BNPL (Buy Now Pay Later) gateway. Supports installment plans with RSA-SHA256-signed API requests.

> **Note:** Koko's API specification may change before production go-live. Confirm endpoint names and field names against your official Koko API documentation. The implementation includes a safe fallback (redirect-only mode) when credentials are absent.

## Configuration

```env
KOKO_MERCHANT_ID=your_merchant_id
KOKO_SECRET_KEY=your_hmac_secret        # for webhook HMAC verification
KOKO_API_KEY=your_api_key               # for checkout session creation
KOKO_PRIVATE_KEY_PATH=config/koko_private.pem   # RSA private key for request signing
```

## How It Works

### With API credentials configured

1. Server POSTs to `https://api.koko.lk/v1/checkout/session` with:
   - Bearer `KOKO_API_KEY` authorization header
   - RSA-SHA256 signature over the JSON body in `X-Koko-Signature` header
2. Koko returns a `checkoutUrl` and `sessionId`.
3. Customer is redirected to the Koko-hosted checkout.
4. Koko POSTs a webhook to `POST /api/v1/payments/webhooks/koko`.

### Fallback mode (no API credentials)

If `KOKO_API_KEY` is not set or the private key file is missing, the gateway builds a deterministic redirect URL. This keeps existing test/sandbox flows working while credentials are being provisioned.

## RSA Key Setup

```bash
# Generate private key
openssl genrsa -out config/koko_private.pem 2048

# Extract public key (share with Koko support)
openssl rsa -in config/koko_private.pem -pubout -out config/koko_public.pem
```

Never commit `koko_private.pem` to version control. Add to `.gitignore`.

## Installment Plans

Pass `metadata.installmentPlans` (array of month counts) when creating a payment:

```typescript
await paymentService.createPayment(
  user,
  {
    checkoutRef: 'checkout-token',
    method: 'koko',
    // metadata forwarded to gateway:
  },
  actor,
);
```

## Webhook

Koko calls `POST /api/v1/payments/webhooks/koko`.

Verification: `HMAC-SHA256(secret_key, raw_request_body)` must equal `X-Koko-Signature` header.

Status mapping:

| Koko status              | Platform status |
| ------------------------ | --------------- |
| `approved` / `completed` | `paid`          |
| `pending`                | `processing`    |
| `declined` / `failed`    | `failed`        |
| `cancelled`              | `cancelled`     |
| `expired`                | `expired`       |

## Sandbox Setup

1. Contact Koko to obtain sandbox credentials.
2. Set `KOKO_MERCHANT_ID`, `KOKO_API_KEY`, `KOKO_SECRET_KEY`.
3. Generate RSA key pair and register public key with Koko sandbox.
4. Use ngrok to expose webhook endpoint.

## Production Setup

1. Provide Koko with your RSA public key.
2. Set `KOKO_PRIVATE_KEY_PATH` to the absolute or CWD-relative path of the PEM file.
3. Configure webhook URL: `https://yourdomain.com/api/v1/payments/webhooks/koko`.

## Troubleshooting

| Issue                       | Cause                             | Fix                                                                      |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Using fallback redirect     | API key or key file missing       | Set `KOKO_API_KEY` and ensure PEM file exists at `KOKO_PRIVATE_KEY_PATH` |
| `invalid_signature` webhook | Secret mismatch                   | Verify `KOKO_SECRET_KEY` matches dashboard                               |
| 401 from API                | Wrong API key                     | Check `KOKO_API_KEY` value                                               |
| RSA sign error              | Key file not found / wrong format | Verify PEM path and format                                               |
