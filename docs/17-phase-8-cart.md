# Phase 8 — Cart Engine

Backend-only shopping cart under `/api/v1/cart`.

**Not included:** Checkout, Orders, Payments, Frontend.  
**Does not reserve stock** — inventory is checked only; reservation is checkout’s job.

## Re-seed permissions (required)

```bash
pnpm --filter @fe-platform/api seed:auth
```

| Permission    | Purpose                     |
| ------------- | --------------------------- |
| `cart.manage` | Customer own cart mutations |
| `cart.view`   | Admin read-only carts       |

Customers also use `account.read` / `account.update` for access. Guests need no RBAC — identified by `x-guest-cart-token` / `fe_guest_cart` cookie.

## Endpoints

| Method | Path                      | Purpose                         |
| ------ | ------------------------- | ------------------------------- |
| GET    | `/cart`                   | Get or create cart              |
| POST   | `/cart/items`             | Add variant line                |
| PATCH  | `/cart/items/:id`         | Update quantity                 |
| DELETE | `/cart/items/:id`         | Remove line                     |
| POST   | `/cart/merge`             | Merge guest → customer (auth)   |
| POST   | `/cart/save-for-later`    | Move lines to saved             |
| POST   | `/cart/restore`           | Restore saved → cart            |
| DELETE | `/cart/clear`             | Clear active cart lines         |
| POST   | `/cart/validate`          | Full validation + price refresh |
| GET    | `/cart/admin/:customerId` | Admin read-only                 |

## Behavior

- **Guest + customer carts** with automatic guest token issuance
- **Merge** on login via `POST /cart/merge` (duplicate variants → latest quantity; saved items preserved)
- **Price snapshots:** `priceAtAdd`, `currentPrice`, `salePrice`, `compareAtPrice`, `priceChanged`, `priceDifference`
- **Totals:** subtotal, discount placeholder, estimated tax/shipping (structure only), grand total, weight, quantity
- **Validation:** variant/product active, inventory available (sum across warehouses), min/max qty, price change warnings
- **No stock reservation** on add/update

## Audit

`cart.item_added`, `cart.item_removed`, `cart.quantity_changed`, `cart.cleared`, `cart.merged`, `cart.saved_for_later`, `cart.restored`

## Architecture

- Models: `models/cart.models.ts`
- Service: `services/cart.service.ts`
- Zod: `schemas/cart.schema.ts`
- Routes: `routes/cart/cart.routes.ts`
