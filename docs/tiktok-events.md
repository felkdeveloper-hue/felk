# TikTok Events API

> Server-side event tracking for TikTok advertising via the TikTok Events API v1.3.

## Configuration

```env
TIKTOK_PIXEL_ID=your_pixel_id
TIKTOK_ACCESS_TOKEN=your_access_token
```

Both variables must be set. If either is absent, all calls are silent no-ops.

## Events Supported

| Method                  | TikTok Event         |
| ----------------------- | -------------------- |
| `trackPageView`         | `ViewContent` (page) |
| `trackViewContent`      | `ViewContent`        |
| `trackSearch`           | `Search`             |
| `trackAddToCart`        | `AddToCart`          |
| `trackInitiateCheckout` | `InitiateCheckout`   |
| `trackCompletePayment`  | `CompletePayment`    |
| `trackPurchase`         | `CompletePayment`    |
| `trackRegistration`     | `Registration`       |
| `trackWishlist`         | `AddToWishlist`      |

## PII Hashing

Email and phone are SHA-256 hashed. Phone numbers are normalised (non-numeric characters stripped) before hashing. Raw PII never leaves the server.

## Deduplication

A `event_id` (UUID) is generated per event and shared with Meta via the `analyticsService` facade, enabling cross-provider dedup in the analytics dashboard.

## Retry Queue

Same Mongo-backed retry infrastructure as Meta CAPI. Failed events land in `analytics_event_logs` with `provider: 'tiktok'` and are retried by the cron sweep.

## API Endpoint

Events are POSTed to `https://business-api.tiktok.com/open_api/v1.3/event/track/` with `Access-Token: <token>` header.

## Sandbox Setup

1. Create a TikTok Ads account and a Pixel in **TikTok Ads Manager → Assets → Events**.
2. Use the **Test Events** tool in TikTok Events Manager to verify payloads.
3. Generate an access token from **TikTok for Business → Access Token**.
4. Set `TIKTOK_PIXEL_ID` and `TIKTOK_ACCESS_TOKEN`.

## Production Setup

1. Use a long-lived access token from a service account.
2. Set tokens in production `.env`.
3. Verify events appear in TikTok Events Manager.

## Troubleshooting

| Issue                   | Cause                | Fix                                     |
| ----------------------- | -------------------- | --------------------------------------- |
| 40001 error             | Invalid access token | Regenerate token                        |
| Events not in dashboard | Pixel ID wrong       | Check `TIKTOK_PIXEL_ID`                 |
| Events in retry queue   | Network error        | Check `analytics_event_logs` collection |
