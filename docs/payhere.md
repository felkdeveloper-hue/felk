# PayHere Integration

> Payment gateway for Sri Lankan merchants. Supports sandbox and live modes with redirect-based checkout.

## Configuration

```env
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_MODE=sandbox          # sandbox | live
```

## How It Works

PayHere uses a redirect-based checkout flow:

1. The server builds a signed checkout URL (MD5 hash of `merchant_id + order_id + amount + currency + MD5(secret)`).
2. The customer is redirected to PayHere's hosted checkout page.
3. After payment, PayHere sends a webhook `POST /webhooks/payhere` to the server.
4. The server verifies the webhook signature and updates the payment status.
5. The customer is redirected to `PAYMENT_RETURN_URL` or `PAYMENT_CANCEL_URL`.

## Webhook

PayHere calls `POST /api/v1/payments/webhooks/payhere` with `application/x-www-form-urlencoded`.

Fields verified:

- `merchant_id` must match config
- `md5sig` must equal `MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(secret)).toUpperCase()`

Status codes:

| Code | Status       |
| ---- | ------------ |
| `2`  | `paid`       |
| `0`  | `processing` |
| `-1` | `cancelled`  |
| `-2` | `failed`     |
| `-3` | `refunded`   |

## Transaction Verification (defense-in-depth)

`payHereGateway.verifyTransaction(orderId)` calls PayHere's server-to-server "Retrieve Payment" API to independently confirm the payment status. This is optional and supplementary — webhook verification is authoritative.

## Sandbox Setup

1. Register at [https://sandbox.payhere.lk](https://sandbox.payhere.lk).
2. Get your **Merchant ID** and **Merchant Secret** from the sandbox dashboard.
3. Set `PAYHERE_MODE=sandbox`.
4. Use PayHere's test card numbers from their sandbox documentation.
5. Configure webhooks to point to your tunnel URL (e.g. ngrok).

## Production Setup

1. Register at [https://www.payhere.lk](https://www.payhere.lk).
2. Complete KYC and get live credentials.
3. Set `PAYHERE_MODE=live`.
4. Configure webhook URL in PayHere dashboard to `https://yourdomain.com/api/v1/payments/webhooks/payhere`.
5. Ensure `PRODUCTION_STRICT=true` to validate that dev secrets are not used.

## Troubleshooting

| Issue                             | Cause                  | Fix                                                   |
| --------------------------------- | ---------------------- | ----------------------------------------------------- |
| `invalid_signature` webhook       | Secret mismatch        | Verify `PAYHERE_MERCHANT_SECRET` matches dashboard    |
| `amount_mismatch`                 | Client tampered amount | Server re-prices at checkout creation                 |
| Webhook not received              | URL not configured     | Set URL in PayHere dashboard; use ngrok for local dev |
| `dev-payhere-merchant-id` in logs | Env var not set        | Set `PAYHERE_MERCHANT_ID` in `.env`                   |
