# Phase 6 — Inventory & Warehouse Management

Backend-only inventory under `/api/v1/inventory`.

**Not included:** Cart, Wishlist, Checkout, Orders, Payments, Frontend.

Orders (future) must consume inventory APIs only — never mutate stock tables directly.

## Re-seed permissions (required)

```bash
pnpm --filter @fe-platform/api seed:auth
```

| Permission              | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `inventory.view`        | List / read stock, history, alerts               |
| `inventory.create`      | Create inventory items / import placeholder      |
| `inventory.update`      | Update rules, thresholds, bulk ops               |
| `inventory.adjust`      | Adjustments, receive, damage, returns, movements |
| `inventory.transfer`    | Inter-warehouse transfers                        |
| `inventory.reserve`     | Reserve / release / commit                       |
| `inventory.export`      | Export stock                                     |
| `warehouse.manage`      | Warehouse CRUD                                   |
| `supplier.manage`       | Suppliers + supplier products                    |
| `purchase-order.manage` | Purchase orders + receiving                      |

Legacy aliases still accepted: `inventory.read`, `warehouses.read`, `warehouses.manage`.

## Module map

| Area                          | Base path                                      |
| ----------------------------- | ---------------------------------------------- |
| Warehouses                    | `/inventory/warehouses`                        |
| Inventory items               | `/inventory/items`                             |
| Movements / history           | `/inventory/movements`, `/inventory/history`   |
| Adjustments                   | `/inventory/adjustments`                       |
| Receiving / damaged / returns | `/inventory/receiving`, `/damaged`, `/returns` |
| Reservations                  | `/inventory/reservations`                      |
| Suppliers                     | `/inventory/suppliers`                         |
| Purchase orders               | `/inventory/purchase-orders`                   |
| Transfers                     | `/inventory/transfers`                         |
| Alerts / rules                | `/inventory/alerts`, `/inventory/rules`        |

## Business rules

- Stock buckets cannot go negative
- Reservation cannot exceed **available**
- Commit reduces **reserved** and **onHand**
- Release returns reserved → available
- Transfers: ship = transfer_out (A), receive = transfer_in (B)
- Every movement writes immutable `stock_movements` + audit log
- Optimistic concurrency via `version` (`409 VERSION_CONFLICT`)

## Reservation lifecycle

`active` → `released` | `committed` | `expired` (TTL + `/reservations/expire-due`)

## Transfer lifecycle

`requested` → `approved` → `packed` → `shipped` → `received` (or `cancelled` before ship)

## Architecture

- Models: `models/inventory.models.ts`
- Stock engine: `services/inventory.service.ts` (`applyMovement`)
- Zod: `schemas/inventory.schema.ts`
- Routes: `routes/inventory/inventory.routes.ts`
