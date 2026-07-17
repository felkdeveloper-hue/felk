# Phase 9 — Checkout Engine

Backend-only checkout under `/api/v1/checkout`.

**Not included:** Orders, Payments, Frontend.  
**Stock:** Reserves inventory only — **never commits**.

## Re-seed permissions (required)

```bash
pnpm --filter @fe-platform/api seed:auth
```

| Permission        | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| `checkout.manage` | Customer start/validate/reserve/release/refresh/cancel |
| `checkout.view`   | Admin read-only access                                 |

## Flow

Load cart → validate products/prices/stock → reserve inventory → calculate tax/shipping → return checkout token + summary.

## Endpoints

| Method | Path                 | Purpose                                  |
| ------ | -------------------- | ---------------------------------------- |
| POST   | `/checkout/start`    | Create session (auto-reserve by default) |
| GET    | `/checkout/:id`      | Get by id or token                       |
| POST   | `/checkout/validate` | Re-validate lines/prices                 |
| POST   | `/checkout/reserve`  | Reserve stock                            |
| POST   | `/checkout/release`  | Release reservations                     |
| POST   | `/checkout/refresh`  | Recalc + extend reservation TTL          |
| DELETE | `/checkout/cancel`   | Cancel + release                         |

Body reference fields: `id` | `checkoutId` | `checkoutToken`.

## Session fields

Customer, cart, address snapshots, shipping/delivery method, tax/shipping estimates, coupon/gift-card placeholders, totals, reservation IDs, reservation expiry, checkout token, status.

## Integration

- **Inventory:** `reservationService.reserve/release/extend` (commit deferred to Orders)
- **Shipping:** CMS zones + method structure (`standard` / `express` / `pickup` / `free`)
- **Tax:** CMS tax configs by country/province (provider placeholder)
- **Coupons / gift cards:** placeholder payloads only

## Rules

- One active checkout session per customer (`open` | `reserved` | `ready`)
- Reject expired reservations (`RESERVATION_EXPIRED`)
- Ownership enforced (customer own / admin view)

## Audit

`checkout.started`, `checkout.reservation_created`, `checkout.reservation_released`, `checkout.reservation_expired`, `checkout.cancelled`, `checkout.refreshed`, `checkout.validated`

## Architecture

- Models: `models/checkout.models.ts`
- Service: `services/checkout.service.ts`
- Calculators: `services/checkout-calculators.ts`
- Routes: `routes/checkout/checkout.routes.ts`
