# Meta Conversions API

> Server-side event tracking for Meta (Facebook) advertising. Events are sent directly from the backend, bypassing ad blockers, and are deduplicated against browser pixel events via a shared `event_id`.

## Configuration

```env
META_CAPI_TOKEN=your_access_token       # System User token from Meta Business Manager
META_PIXEL_ID=your_pixel_id             # Pixel ID from Meta Events Manager
```

Both variables must be set for the service to become active. If either is absent, all event calls are silently no-ops (logged at `debug` level).

## Events Supported

| Method                      | Meta Event             |
| --------------------------- | ---------------------- |
| `trackPageView`             | `PageView`             |
| `trackViewContent`          | `ViewContent`          |
| `trackSearch`               | `Search`               |
| `trackAddToWishlist`        | `AddToWishlist`        |
| `trackAddToCart`            | `AddToCart`            |
| `trackInitiateCheckout`     | `InitiateCheckout`     |
| `trackAddPaymentInfo`       | `AddPaymentInfo`       |
| `trackPurchase`             | `Purchase`             |
| `trackLead`                 | `Lead`                 |
| `trackCompleteRegistration` | `CompleteRegistration` |

## PII Hashing

Customer PII is normalized and SHA-256 hashed **once** with Meta's official
`capi-param-builder-nodejs` Parameter Builder before it is sent. Do not pre-hash
values in callers. `fbc`, `fbp`, IP addresses, and user agents are never hashed.

Missing, empty, or invalid fields are omitted from `user_data`.

## Browser identifiers (`_fbp` / `_fbc`)

The storefront uses `meta-capi-param-builder-clientjs` to capture and preserve
first-party `_fbp` / `_fbc` cookies (including `fbclid` → `fbc`). Those values
are sent in JSON on CAPI-bound events and on registration. The API prefers the
browser-sent values and will only construct `fbc` from `fbclid` when `_fbc` is
absent.

## Deduplication

Commerce events that fire in both the Pixel and CAPI share the same identifier:

- Browser: `fbq(..., { eventID })`
- Server: `event_id`

| Event                  | `event_id`               | Pixel + CAPI                       |
| ---------------------- | ------------------------ | ---------------------------------- |
| ViewContent, AddToCart | random UUID              | Yes                                |
| InitiateCheckout       | `checkout-{token}`       | Yes                                |
| Purchase               | `purchase-{orderNumber}` | Yes                                |
| PageView               | random UUID              | Pixel only                         |
| CompleteRegistration   | random UUID              | **CAPI only** (no Pixel duplicate) |

## CompleteRegistration

Fired after a user is created in `AuthService.register` and checkout
`completeSignup`. Payload includes available match keys only:

- `em`, `fn`, `ln`, `ph` (when collected)
- `external_id` (stable customer id)
- `client_ip_address`, `client_user_agent`
- `fbp` / `fbc` when the browser sent them
- `country` only when a CDN country header exists

`ct`, `st`, `zp`, and `db` are **not** sent at registration because those fields
are not collected on the signup form. Purchase events send city/state/zip from
the shipping address, and dob/gender from the customer profile, **when present**.

## Retry Queue

Failed events are persisted in the `analytics_event_logs` MongoDB collection with `status: 'retrying'` and exponential backoff (`nextAttemptAt`). A sweep runs every 60 seconds via `apps/api/src/cron/index.ts`.

## Backend Auto-wiring

The following events fire automatically without storefront involvement:

- **InitiateCheckout** + **AddPaymentInfo** — when a gateway session is created (`PaymentService.createAttempt`)
- **Purchase** — on a verified `PAID` webhook
- **CompleteRegistration** — on user registration (`AuthService.register`) and checkout account creation (`checkoutAuthService.completeSignup`)

## Storefront Tracking Endpoint

The storefront can send additional events by posting to:

```http
POST /api/v1/tracking/event
Content-Type: application/json

{
  "eventName": "AddToCart",
  "url": "https://yoursite.com/product/red-dress",
  "customData": { "content_ids": ["variant-123"], "currency": "LKR", "value": 2500 },
  "userData": { "fbp": "fb.1.1234.abc", "fbc": "fb.1.1234.xyz" }
}
```

## Sandbox Setup

1. Create a test pixel in Meta Events Manager.
2. Enable Test Events mode in Events Manager to verify payloads without affecting real data.
3. Use the [Payload Helper](https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api) to validate your token.
4. Set `META_CAPI_TOKEN` and `META_PIXEL_ID`.

## Production Setup

1. Create a **System User** in Meta Business Manager with `ads_management` permission.
2. Generate a System User access token with `CONVERSIONS_API` permission.
3. Set `META_CAPI_TOKEN` and `META_PIXEL_ID` in production env.
4. Verify events appear in Meta Events Manager → Test Events or Data Sources.

## Troubleshooting

| Issue                 | Cause                       | Fix                                                          |
| --------------------- | --------------------------- | ------------------------------------------------------------ |
| Events not appearing  | Token or pixel ID wrong     | Verify credentials in Meta Events Manager                    |
| `400` from Meta API   | Invalid payload             | Check `lastError` in `analytics_event_logs` collection       |
| Events in retry queue | Network error or rate limit | Check `analytics_event_logs.status = 'retrying'`             |
| Dedup not working     | `event_id` mismatch         | Ensure browser pixel uses same `event_id` via storefront SDK |
