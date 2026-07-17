# 04 — API Design

> REST contracts for `/api/v1`. **Design only** — no implementation.  
> Standard envelope, auth rules, and endpoint catalog by module.

---

## 1. Conventions

### Base URL

```
https://api.example.com/api/v1
```

### Response Envelope

**Success**

```json
{
  "success": true,
  "message": "Optional human message",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": { "field": "email", "issue": "Required" }
  }
}
```

### Common Headers

| Header                           | Direction | Purpose                    |
| -------------------------------- | --------- | -------------------------- |
| `Authorization: Bearer <access>` | Req       | Auth                       |
| `X-Request-Id`                   | Both      | Tracing                    |
| `Idempotency-Key`                | Req       | POST payments / orders     |
| `X-CSRF-Token`                   | Req       | Cookie-based browser flows |

### Auth Legend

| Symbol          | Meaning                                               |
| --------------- | ----------------------------------------------------- |
| Public          | No auth                                               |
| Auth            | Valid access token                                    |
| Perm:`x`        | Auth + permission `x`                                 |
| Role:`customer` | Customer role (or equivalent customer permission set) |

### Status Codes

| Code | Use                                  |
| ---- | ------------------------------------ |
| 200  | OK                                   |
| 201  | Created                              |
| 204  | No content                           |
| 400  | Validation                           |
| 401  | Unauthenticated                      |
| 403  | Forbidden                            |
| 404  | Not found                            |
| 409  | Conflict (SKU, stock, state machine) |
| 422  | Semantic business rule failure       |
| 429  | Rate limited                         |
| 500  | Unexpected                           |

---

## 2. Auth (Contracts Only)

| Method | Path                    | Auth                | Purpose               |
| ------ | ----------------------- | ------------------- | --------------------- |
| POST   | `/auth/register`        | Public              | Customer registration |
| POST   | `/auth/login`           | Public              | Issue tokens          |
| POST   | `/auth/refresh`         | Cookie/body refresh | Rotate tokens         |
| POST   | `/auth/logout`          | Auth                | Revoke session        |
| POST   | `/auth/forgot-password` | Public              | Start reset           |
| POST   | `/auth/reset-password`  | Public              | Complete reset        |
| POST   | `/auth/otp/request`     | Public/Auth         | Send OTP              |
| POST   | `/auth/otp/verify`      | Public/Auth         | Verify OTP            |
| GET    | `/auth/me`              | Auth                | Current principal     |
| GET    | `/auth/sessions`        | Auth                | List devices          |
| DELETE | `/auth/sessions/:id`    | Auth                | Revoke device         |

**Login response (shape):** `{ user, accessToken, expiresIn }` (+ httpOnly refresh cookie).

---

## 3. Users / Roles / Permissions

### Users

| Method | Path                | Auth                | Purpose          |
| ------ | ------------------- | ------------------- | ---------------- |
| GET    | `/users`            | Perm:`users.read`   | List staff users |
| POST   | `/users`            | Perm:`users.create` | Create staff     |
| GET    | `/users/:id`        | Perm:`users.read`   | Get user         |
| PATCH  | `/users/:id`        | Perm:`users.update` | Update           |
| POST   | `/users/:id/lock`   | Perm:`users.lock`   | Lock             |
| POST   | `/users/:id/unlock` | Perm:`users.lock`   | Unlock           |
| DELETE | `/users/:id`        | Perm:`users.delete` | Soft delete      |

### Roles

| Method | Path                     | Auth                |
| ------ | ------------------------ | ------------------- |
| GET    | `/roles`                 | Perm:`roles.read`   |
| POST   | `/roles`                 | Perm:`roles.manage` |
| GET    | `/roles/:id`             | Perm:`roles.read`   |
| PATCH  | `/roles/:id`             | Perm:`roles.manage` |
| PUT    | `/roles/:id/permissions` | Perm:`roles.manage` |
| DELETE | `/roles/:id`             | Perm:`roles.manage` |

### Permissions

| Method | Path           | Auth              |
| ------ | -------------- | ----------------- |
| GET    | `/permissions` | Perm:`roles.read` |

---

## 4. Customers & Addresses

| Method | Path                        | Auth                    | Purpose        |
| ------ | --------------------------- | ----------------------- | -------------- |
| GET    | `/customers`                | Perm:`customers.read`   | Admin list     |
| GET    | `/customers/:id`            | Perm:`customers.read`   | Admin get      |
| PATCH  | `/customers/:id`            | Perm:`customers.update` | Admin update   |
| GET    | `/me/customer`              | Role:customer           | Own profile    |
| PATCH  | `/me/customer`              | Role:customer           | Update profile |
| GET    | `/me/addresses`             | Role:customer           | List           |
| POST   | `/me/addresses`             | Role:customer           | Create         |
| PATCH  | `/me/addresses/:id`         | Role:customer           | Update         |
| DELETE | `/me/addresses/:id`         | Role:customer           | Soft delete    |
| POST   | `/me/addresses/:id/default` | Role:customer           | Set default    |

---

## 5. Catalog — Public Read

| Method | Path                         | Auth   | Purpose       |
| ------ | ---------------------------- | ------ | ------------- |
| GET    | `/catalog/products`          | Public | Search/list   |
| GET    | `/catalog/products/:slug`    | Public | PDP           |
| GET    | `/catalog/categories`        | Public | Tree          |
| GET    | `/catalog/categories/:slug`  | Public | Category page |
| GET    | `/catalog/brands`            | Public | Brands        |
| GET    | `/catalog/brands/:slug`      | Public | Brand page    |
| GET    | `/catalog/collections/:slug` | Public | Collection    |
| GET    | `/catalog/colors`            | Public | Filters       |
| GET    | `/catalog/sizes`             | Public | Filters       |

**Query params (products):** `page`, `limit`, `q`, `category`, `brand`, `collection`, `color`, `size`, `minPrice`, `maxPrice`, `sort`, `tags`.

---

## 6. Catalog — Admin Write

### Products

| Method | Path                                 | Auth                   |
| ------ | ------------------------------------ | ---------------------- |
| GET    | `/admin/products`                    | Perm:`products.read`   |
| POST   | `/admin/products`                    | Perm:`products.create` |
| GET    | `/admin/products/:id`                | Perm:`products.read`   |
| PATCH  | `/admin/products/:id`                | Perm:`products.update` |
| DELETE | `/admin/products/:id`                | Perm:`products.delete` |
| POST   | `/admin/products/:id/media`          | Perm:`products.update` |
| DELETE | `/admin/products/:id/media/:mediaId` | Perm:`products.update` |

### Variants

| Method | Path                           | Auth                   |
| ------ | ------------------------------ | ---------------------- |
| GET    | `/admin/products/:id/variants` | Perm:`products.read`   |
| POST   | `/admin/products/:id/variants` | Perm:`products.create` |
| PATCH  | `/admin/variants/:id`          | Perm:`products.update` |
| DELETE | `/admin/variants/:id`          | Perm:`products.delete` |

### Categories / Brands / Collections / Attributes / Colors / Sizes

Standard CRUD under `/admin/{resource}` with matching permissions:

- `categories.*`, `brands.*`, `collections.*`, `attributes.*`, `colors.*`, `sizes.*`

---

## 7. Inventory & Warehouses

| Method | Path                          | Auth                      | Purpose       |
| ------ | ----------------------------- | ------------------------- | ------------- |
| GET    | `/admin/warehouses`           | Perm:`warehouses.read`    | List          |
| POST   | `/admin/warehouses`           | Perm:`warehouses.manage`  | Create        |
| PATCH  | `/admin/warehouses/:id`       | Perm:`warehouses.manage`  | Update        |
| GET    | `/admin/inventory`            | Perm:`inventory.read`     | Positions     |
| GET    | `/admin/inventory/:variantId` | Perm:`inventory.read`     | By variant    |
| POST   | `/admin/inventory/adjust`     | Perm:`inventory.adjust`   | Manual adjust |
| POST   | `/admin/inventory/transfer`   | Perm:`inventory.transfer` | WH→WH         |
| GET    | `/admin/inventory/ledger`     | Perm:`inventory.read`     | History       |
| GET    | `/admin/inventory/alerts`     | Perm:`inventory.read`     | Low stock     |

**Adjust request:** `{ warehouseId, variantId, type, quantity, note }`  
**Responses:** `409` if version conflict / insufficient stock.

---

## 8. Wishlist

| Method | Path                      | Auth          |
| ------ | ------------------------- | ------------- |
| GET    | `/me/wishlist`            | Role:customer |
| POST   | `/me/wishlist`            | Role:customer |
| DELETE | `/me/wishlist/:variantId` | Role:customer |

---

## 9. Coupons & Gift Cards

| Method | Path                          | Auth                    |
| ------ | ----------------------------- | ----------------------- |
| GET    | `/admin/coupons`              | Perm:`coupons.read`     |
| POST   | `/admin/coupons`              | Perm:`coupons.manage`   |
| PATCH  | `/admin/coupons/:id`          | Perm:`coupons.manage`   |
| DELETE | `/admin/coupons/:id`          | Perm:`coupons.manage`   |
| POST   | `/checkout/coupons/validate`  | Auth/Public             | Preview discount  |
| POST   | `/admin/gift-cards`           | Perm:`giftcards.manage` |
| GET    | `/admin/gift-cards`           | Perm:`giftcards.read`   |
| POST   | `/checkout/gift-cards/redeem` | Auth                    | Apply to checkout |

---

## 10. Orders

| Method | Path                       | Auth                 | Purpose                      |
| ------ | -------------------------- | -------------------- | ---------------------------- |
| POST   | `/orders`                  | Auth/Guest token     | Create order + reserve stock |
| GET    | `/me/orders`               | Role:customer        | Customer history             |
| GET    | `/me/orders/:id`           | Role:customer        | Detail                       |
| POST   | `/me/orders/:id/cancel`    | Role:customer        | Cancel if allowed            |
| GET    | `/admin/orders`            | Perm:`orders.read`   | Admin list                   |
| GET    | `/admin/orders/:id`        | Perm:`orders.read`   | Admin detail                 |
| POST   | `/admin/orders/:id/status` | Perm:`orders.update` | Transition                   |
| POST   | `/admin/orders/:id/cancel` | Perm:`orders.cancel` | Admin cancel                 |
| POST   | `/admin/orders/:id/refund` | Perm:`orders.refund` | Refund                       |

**Create order request (conceptual):**

```json
{
  "items": [{ "variantId": "…", "quantity": 2 }],
  "shippingAddressId": "…",
  "billingAddressId": "…",
  "couponCode": "SUMMER10",
  "giftCardCode": null,
  "paymentMethod": "payhere",
  "notes": null
}
```

**Create order response:** `{ order, payment: { redirectUrl | instructions } }`  
**Status codes:** `201`, `409` stock, `422` coupon invalid.

---

## 11. Payments & Webhooks

| Method | Path                | Auth       | Purpose                        |
| ------ | ------------------- | ---------- | ------------------------------ |
| POST   | `/payments/intents` | Auth       | Create/retry payment for order |
| GET    | `/payments/:id`     | Auth       | Status                         |
| POST   | `/webhooks/payhere` | Public+sig | Gateway callback               |
| POST   | `/webhooks/koko`    | Public+sig | Gateway callback               |
| POST   | `/webhooks/mintpay` | Public+sig | Gateway callback               |

Webhooks: **no JWT**; signature + IP allowlist; always idempotent.

---

## 12. Shipping

| Method | Path                          | Auth                   |
| ------ | ----------------------------- | ---------------------- |
| POST   | `/admin/orders/:id/shipments` | Perm:`shipping.manage` |
| PATCH  | `/admin/shipments/:id`        | Perm:`shipping.manage` |
| GET    | `/me/orders/:id/shipments`    | Role:customer          |

---

## 13. Reviews & Q&A

| Method | Path                                | Auth                    |
| ------ | ----------------------------------- | ----------------------- |
| GET    | `/catalog/products/:slug/reviews`   | Public                  |
| POST   | `/catalog/products/:id/reviews`     | Role:customer           |
| PATCH  | `/admin/reviews/:id`                | Perm:`reviews.moderate` |
| GET    | `/catalog/products/:slug/questions` | Public                  |
| POST   | `/catalog/products/:id/questions`   | Role:customer           |
| POST   | `/admin/questions/:id/answers`      | Perm:`qa.manage`        |

---

## 14. Notifications

| Method | Path                         | Auth |
| ------ | ---------------------------- | ---- |
| GET    | `/me/notifications`          | Auth |
| POST   | `/me/notifications/:id/read` | Auth |
| POST   | `/me/notifications/read-all` | Auth |

---

## 15. CMS / Banners / Marketing / Blogs / FAQs

| Area            | Public GET                 | Admin CRUD Perm    |
| --------------- | -------------------------- | ------------------ |
| CMS pages       | `/content/pages/:slug`     | `cms.manage`       |
| Hero banners    | `/content/banners`         | `banners.manage`   |
| Marketing slots | `/content/marketing/:slot` | `marketing.manage` |
| Blogs           | `/content/blogs`, `/:slug` | `blogs.manage`     |
| FAQs            | `/content/faqs`            | `faqs.manage`      |

Admin paths: `/admin/cms/pages`, `/admin/banners`, `/admin/marketing`, `/admin/blogs`, `/admin/faqs`.

---

## 16. Contact & Newsletter

| Method | Path                            | Auth                    |
| ------ | ------------------------------- | ----------------------- |
| POST   | `/contact`                      | Public                  | Rate limited |
| GET    | `/admin/contact-messages`       | Perm:`support.inbox`    |
| PATCH  | `/admin/contact-messages/:id`   | Perm:`support.inbox`    |
| POST   | `/newsletter/subscribe`         | Public                  |
| POST   | `/newsletter/unsubscribe`       | Public (tokenized)      |
| GET    | `/admin/newsletter/subscribers` | Perm:`marketing.manage` |

---

## 17. Analytics & Reports

| Method | Path                         | Auth                  |
| ------ | ---------------------------- | --------------------- |
| POST   | `/analytics/events`          | Public/Auth           | Ingest (batched) |
| GET    | `/admin/reports/:key`        | Perm:`reports.view`   |
| POST   | `/admin/reports/:key/export` | Perm:`reports.export` |

---

## 18. Settings & Logs

| Method | Path                   | Auth                   |
| ------ | ---------------------- | ---------------------- |
| GET    | `/settings/public`     | Public                 | Non-secret keys |
| GET    | `/admin/settings`      | Perm:`settings.read`   |
| PUT    | `/admin/settings/:key` | Perm:`settings.manage` |
| GET    | `/admin/audit-logs`    | Perm:`audit.read`      |
| GET    | `/admin/activity-logs` | Perm:`activity.read`   |

---

## 19. Health

| Method | Path            | Auth   |
| ------ | --------------- | ------ |
| GET    | `/health`       | Public |
| GET    | `/health/ready` | Public | Checks Mongo/Redis |

---

## 20. Versioning & Deprecation

- Additive fields = non-breaking.
- Removing/renaming fields = new major `/api/v2`.
- Deprecate with `Sunset` header + docs note ≥ 90 days.
