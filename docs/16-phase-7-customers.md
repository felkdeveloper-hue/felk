# Phase 7 — Customer Domain

Backend-only customer CRM under `/api/v1/customers`.

**Not included:** Cart, Checkout, Orders, Payments, Frontend.

## Re-seed permissions (required)

```bash
pnpm --filter @fe-platform/api seed:auth
```

| Permission                        | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `customers.view`                  | Admin list / read customers                   |
| `customers.update`                | Admin update profiles / preferences / rewards |
| `customers.delete`                | Soft delete customers                         |
| `customers.notes`                 | Admin customer notes                          |
| `customers.tags`                  | Tag dictionary + assignment                   |
| `wishlist.manage`                 | Wishlists (self)                              |
| `addresses.manage`                | Addresses (self)                              |
| `account.read` / `account.update` | Self profile & preferences                    |

Legacy: `customers.read` still accepted for admin view.

## Ownership

- Customers access **only** `/customers/me/*` (own data).
- Admin/staff use `/customers` and `/customers/:customerId/*`.
- Register creates a linked customer profile automatically; `/me` also lazy-creates if missing.

## Module map

| Area            | Path                                                            |
| --------------- | --------------------------------------------------------------- |
| Self profile    | `GET/PATCH /customers/me`                                       |
| Preferences     | `GET/PATCH /customers/me/preferences`                           |
| Addresses       | `/customers/me/addresses`                                       |
| Wishlists       | `/customers/me/wishlists` (+ share token structure)             |
| Recently viewed | `/customers/me/recently-viewed`                                 |
| Saved items     | `/customers/me/saved-items`                                     |
| Rewards         | `/customers/me/rewards` (+ admin earn/redeem)                   |
| Referrals       | `/customers/me/referrals`                                       |
| Loyalty tiers   | `GET /customers/loyalty-tiers` (Silver/Gold/Platinum structure) |
| Tags            | `/customers/tags`                                               |
| Notes           | `/customers/:customerId/notes`                                  |
| Admin CRM       | `GET/PATCH/DELETE /customers/:customerId`                       |

## Structure-only (no checkout)

- **Rewards:** points balance + ledger (earn / redeem / expire)
- **Loyalty:** Silver / Gold / Platinum with benefits + upgrade rules
- **Referrals:** code, invites, accept-by-code, status tracking

## Audit

`customers.profile_updated`, `address_added`, `address_deleted`, `wishlist_created`, `wishlist_deleted`, `preferences_changed`, notes/tags/rewards/referrals.

## Architecture

- Models: `models/customer.models.ts`
- Services: `customer.service`, `customer-address`, `wishlist`, `recently-viewed`, `reward`, `customer-notes-tags`
- Zod: `schemas/customer.schema.ts`
- Routes: `routes/customers/customers.routes.ts`
