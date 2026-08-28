# Meta Marketing API (Ads Insights)

Server-side sync of **genuine** Facebook / Instagram advertising metrics into MongoDB for the admin Traffic & Ads dashboard.

This is separate from:

- **Website analytics** (`pa_visitors` / sessions / page views) — first-party tracking
- **Meta Conversions API** (`META_CAPI_TOKEN` + Pixel) — purchase / event attribution

## Environment variables (API only)

Never expose these as `VITE_*` frontend variables.

| Variable                       | Required        | Description                                                                  |
| ------------------------------ | --------------- | ---------------------------------------------------------------------------- |
| `META_AD_ACCOUNT_ID`           | Yes             | Ad account id, with or without `act_` prefix                                 |
| `META_ADS_ACCESS_TOKEN`        | Recommended     | User/system token with `ads_read` (falls back to `META_CAPI_TOKEN` if unset) |
| `META_ADS_SYNC_LOOKBACK_DAYS`  | No (default 30) | Days of history on each scheduled sync                                       |
| `META_ADS_SYNC_INTERVAL_HOURS` | No (default 6)  | Cron interval                                                                |

## Admin API

- `GET /api/v1/analytics/admin/ads/meta?period=30d` — aggregated performance from stored insights
- `POST /api/v1/analytics/admin/ads/meta/sync` — manual refresh (re-fetches recent days)
- `GET /api/v1/analytics/admin/ads/reconcile?period=30d` — website vs Meta comparison

All credentials stay on the server. The SPA never calls Graph API with secrets.

## Sync behavior

- Idempotent upserts on `(accountId, metricDate, level, campaignId, adsetId, adId)`
- Scheduled job re-pulls the lookback window so Meta attribution adjustments are applied
- On failure, last successfully synced rows remain visible; UI marks sync as stale / shows last error
- Missing API fields are stored and shown as **Unavailable** — never fabricated zeros

## Metric meanings

| Metric                                          | Source             | Meaning               |
| ----------------------------------------------- | ------------------ | --------------------- |
| Unique Visitors / Visits / Page Views by source | First-party        | Our website tracking  |
| Reach / Impressions / Link Clicks / LPV / Spend | Meta Marketing API | Ad platform reporting |

Reach ≠ website visits.
