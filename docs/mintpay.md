# Mintpay Integration

> BNPL (Buy Now Pay Later) gateway. Confirmation matches the official WooCommerce plugin.

## Configuration

```env
MINTPAY_MERCHANT_ID=your_merchant_id
MINTPAY_MERCHANT_SECRET=your_secret       # API Token header + return-hash HMAC
MINTPAY_MODE=sandbox                      # sandbox | live
MINTPAY_NOTIFY_URL=https://api.fe.lk/api/v1/payments/webhooks/mintpay
```

`MINTPAY_SECRET_KEY` is a legacy alias for `MINTPAY_MERCHANT_SECRET` — both are supported.

## How It Works

Mintpay does **not** send a JSON IPN with `X-Mintpay-Signature`. The official plugin confirms payment when Mintpay **redirects the browser** to `success_url` / `fail_url`.

1. Server POSTs the cart to `https://app.mintpay.lk/user-order/api/` (live) or `https://dev.mintpay.lk/user-order/api/` (sandbox) with `Authorization: Token <secret>`.
2. Mintpay returns a `purchase_id`. The shopper is POSTed to the Mintpay login page with that id.
3. `success_url` / `fail_url` point at `GET /api/v1/payments/webhooks/mintpay?orderId=<PAY-…-A1>&hash=<base64(hmac)>`.
4. Success hash = `HMAC-SHA256(secret, merchant_id + amount + order_id)` (hex, then Base64), same as WooCommerce.
5. Fail hash = `HMAC-SHA256(secret, order_id)`.
6. Our API verifies the hash, marks the payment paid, **creates the order**, then 302s to the storefront success page.

Admin orders are created only after this verified return (or a catch-up of an already-paid payment).

## Status mapping (optional JSON IPN, if Mintpay ever posts one)

| Mintpay status        | Platform status |
| --------------------- | --------------- |
| `success` / `paid`    | `paid`          |
| `pending`             | `processing`    |
| `rejected` / `failed` | `failed`        |
| `cancelled`           | `cancelled`     |
| `expired`             | `expired`       |

## Troubleshooting

| Issue                                    | Cause                                     | Fix                                                                 |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Paid in Mintpay portal, missing in admin | Return URL never hit / old webhook design | Redeploy this return-hash flow; run Mintpay order recovery catch-up |
| `unknown_order` on return                | `orderId` not matching payment attempt    | Lookup uses `PAY-…-A1`, purchase id, and payment reference          |
| HTML 403 creating session                | Localhost return URLs / WAF               | Set `API_PUBLIC_URL=https://api.fe.lk`                              |
| 401 Invalid token                        | Wrong live/sandbox secret                 | Check `MINTPAY_MERCHANT_SECRET` and `MINTPAY_MODE`                  |
