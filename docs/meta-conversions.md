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

All customer PII (email, phone, first name, last name, city, country, external ID) is **SHA-256 hashed** before sending. The raw value never leaves the server. See `apps/api/src/utils/pii-hash.ts`.

## Deduplication

Each event is issued with a `event_id` (UUID). The same `event_id` is passed to the storefront tracking SDK so that if a browser pixel is later added, Meta's dedup engine will deduplicate matching server+browser events.

## Retry Queue

Failed events are persisted in the `analytics_event_logs` MongoDB collection with `status: 'retrying'` and exponential backoff (`nextAttemptAt`). A sweep runs every 60 seconds via `apps/api/src/cron/index.ts`.

## Backend Auto-wiring

The following events fire automatically without storefront involvement:

- **InitiateCheckout** + **AddPaymentInfo** — when a gateway session is created (`PaymentService.createAttempt`)
- **Purchase** — on a verified `PAID` webhook
- **CompleteRegistration** — on user registration (`AuthService.register`)

## Storefront Tracking Endpoint

The storefront can send additional events by posting to:

```http
POST /api/v1/tracking/event
Content-Type: application/json

{
  "eventName": "AddToCart",
  "url": "https://yoursite.com/product/red-dress",
  "customData": { "content_ids": ["variant-123"], "currency": "LKR", "value": 2500 },
  "userData": { "fbp": "_fbp.1.1234.abc", "fbc": "_fbc.1.1234.xyz" }
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
