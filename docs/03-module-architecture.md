# 03 — Module Architecture

> Modular monolith: clear domain boundaries, clean layers, no circular dependencies.

---

## 1. Layering (Every Module)

```
routes/          → HTTP mapping only
controllers/     → Parse input, call service, map response (thin)
validators/      → Express/param validators (optional glue)
schemas/         → Zod request/response contracts
services/        → Business rules & orchestration
repositories/    → MongoDB access only
models/          → Mongoose schemas (implement later)
events/          → Domain event emitters
queues/          → Job producers/consumers for this module
```

**Dependency rule:** outer layers depend inward. Repositories never import services. Services never import Express `Request`/`Response`.

---

## 2. Module Catalog

### 2.1 Identity & Access

| Module        | Folder (planned)      | Responsibility                                               |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `auth`        | `modules/auth`        | Login, refresh, logout, OTP, password reset, device sessions |
| `users`       | `modules/users`       | Staff user CRUD, profile, lock/unlock                        |
| `roles`       | `modules/roles`       | Role definitions                                             |
| `permissions` | `modules/permissions` | Permission catalog; role↔permission mapping                  |

### 2.2 Customers & CRM

| Module       | Responsibility                                                             |
| ------------ | -------------------------------------------------------------------------- |
| `customers`  | Customer profiles linked to `users` (role=customer) or guest→account merge |
| `addresses`  | Shipping/billing addresses                                                 |
| `wishlist`   | Per-customer saved variants                                                |
| `contact`    | Contact form messages                                                      |
| `newsletter` | Subscriptions, preferences                                                 |

### 2.3 Catalog

| Module        | Responsibility                                     |
| ------------- | -------------------------------------------------- |
| `products`    | Product aggregate root (SEO, media, pricing flags) |
| `variants`    | SKU-level sellable units (color/size/stock refs)   |
| `categories`  | Tree (parent = category, children = subcategory)   |
| `brands`      | Brand master                                       |
| `collections` | Merchandising groups (manual + rule-based later)   |
| `attributes`  | Attribute definitions (material, fit, etc.)        |
| `colors`      | Color swatches / codes                             |
| `sizes`       | Size charts / codes                                |

### 2.4 Inventory & Warehouses

| Module         | Responsibility                                           |
| -------------- | -------------------------------------------------------- |
| `warehouses`   | Locations, zones                                         |
| `inventory`    | Per-variant-per-warehouse stock, reserve/release, alerts |
| `stock-ledger` | Immutable stock movements                                |

### 2.5 Commerce

| Module        | Responsibility                                       |
| ------------- | ---------------------------------------------------- |
| `orders`      | Order aggregate, status machine                      |
| `order-items` | Line items (snapshot of product/variant at purchase) |
| `coupons`     | Discount rules                                       |
| `gift-cards`  | Stored value, balances, redemptions                  |

### 2.6 Payments & Finance

| Module         | Responsibility                               |
| -------------- | -------------------------------------------- |
| `payments`     | Payment intents against orders               |
| `transactions` | Immutable gateway ledger rows                |
| `invoices`     | Invoice generation metadata (PDF via worker) |

### 2.7 Fulfillment

| Module             | Responsibility                                          |
| ------------------ | ------------------------------------------------------- |
| `shipping`         | Shipments, carriers, tracking                           |
| _(order statuses)_ | Packed / shipped / delivered owned by orders + shipping |

### 2.8 Engagement & Content

| Module          | Responsibility               |
| --------------- | ---------------------------- |
| `reviews`       | Product reviews + moderation |
| `qa`            | Product Q&A                  |
| `notifications` | In-app + push/email fan-out  |
| `cms`           | Pages, blocks                |
| `banners`       | Hero banners / slots         |
| `marketing`     | Campaigns, promo slots       |
| `blogs`         | Articles                     |
| `faqs`          | FAQ entries                  |

### 2.9 Intelligence & Platform

| Module          | Responsibility                          |
| --------------- | --------------------------------------- |
| `analytics`     | Event ingestion                         |
| `reports`       | Aggregated report definitions + exports |
| `settings`      | Key/value + typed settings              |
| `audit-logs`    | Security/compliance trail               |
| `activity-logs` | Softer UI activity trail                |

---

## 3. Cross-Module Communication

### 3.1 Sync (in-process)

Allowed for strongly consistent paths:

- `orders` → `inventory.reserve()`
- `orders` → `payments.createIntent()`
- `auth` → `users.findByEmail()`

### 3.2 Async (events / queues)

Preferred for side effects:

| Event                 | Consumers                                                            |
| --------------------- | -------------------------------------------------------------------- |
| `order.paid`          | inventory.commit, invoice.generate, email.orderPaid, analytics.track |
| `order.cancelled`     | inventory.release, email.cancelled, analytics.track                  |
| `payment.failed`      | order.markAwaiting/Failed, notify user                               |
| `inventory.low_stock` | notify warehouse + marketing                                         |
| `user.registered`     | welcome email, analytics                                             |
| `review.submitted`    | moderation queue                                                     |

Event payload: `{ eventId, type, occurredAt, aggregateId, payload, correlationId }` — consumers must be **idempotent** via `eventId`.

---

## 4. Forbidden Coupling

- Catalog must not import Payments
- Analytics must not mutate Orders
- CMS must not write Inventory
- Frontend apps never talk to Mongo/Redis directly

---

## 5. Shared Kernel (packages)

| Package               | Use                                      |
| --------------------- | ---------------------------------------- |
| `@fe-platform/types`  | Shared DTOs / enums (API contract types) |
| `@fe-platform/config` | Non-secret constants                     |
| `@fe-platform/utils`  | Pure helpers only                        |

Domain logic stays in `apps/api`.

---

## 6. Module Internal Template (Future Code)

```
apps/api/src/modules/<name>/
  <name>.routes.ts
  <name>.controller.ts
  <name>.service.ts
  <name>.repository.ts
  <name>.schema.ts          # Zod
  <name>.events.ts
  <name>.types.ts
  index.ts                  # barrel
```

Until migration to `modules/`, existing `controllers/`, `services/`, `repositories/` folders group by feature filename (`product.service.ts`). See [09-folder-guidelines.md](./09-folder-guidelines.md).

---

## 7. Aggregate Roots (Consistency Boundaries)

| Aggregate     | Children / owned docs                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| **Product**   | Variants (or separate with productId), media, SEO                              |
| **Order**     | OrderItems, status history, payment refs, shipping refs                        |
| **Customer**  | Addresses, wishlist refs                                                       |
| **Warehouse** | Inventory rows (or inventory as separate aggregate keyed by warehouse+variant) |
| **Payment**   | Transactions                                                                   |
| **GiftCard**  | Redemptions                                                                    |

Write operations mutate **one aggregate** per transaction where possible. Cross-aggregate work uses reservation tokens + compensating actions.
