# 05 — RBAC (Roles & Permissions)

> Role-Based Access Control for staff and customers.  
> Enforcement: JWT carries `userId` + `roleId`; permissions loaded from Redis cache or DB; middleware checks `permission` keys.

---

## 1. Model

```
User ──► Role ──► Permissions[]
```

- Permissions are **atomic** strings: `resource.action`
- Roles are bundles of permissions
- Super Admin bypasses checks **only** via explicit `* ` or seeded full grant — prefer listing all perms for auditability
- Customers use role `customer` (storefront) with a fixed small permission set

---

## 2. Roles

| Role Key            | Audience   | Description                                             |
| ------------------- | ---------- | ------------------------------------------------------- |
| `super_admin`       | Internal   | Full platform control; manage roles                     |
| `admin`             | Internal   | Day-to-day operations; no role deletion of system roles |
| `manager`           | Internal   | Catalog, orders, content oversight                      |
| `inventory_manager` | Internal   | Warehouses, stock, transfers                            |
| `marketing_manager` | Internal   | Campaigns, banners, coupons, newsletter                 |
| `customer_support`  | Internal   | Customers, orders (limited), contact inbox              |
| `finance`           | Internal   | Payments, refunds, gift cards, reports finance          |
| `warehouse_staff`   | Internal   | Pack/ship, stock view/adjust limited                    |
| `customer`          | Storefront | Own profile, orders, wishlist, reviews                  |
| `guest`             | Anonymous  | Public catalog + limited checkout start                 |

---

## 3. Permission Catalog

### 3.1 Users & Access

| Permission         | Description                           |
| ------------------ | ------------------------------------- |
| `users.read`       | View staff users                      |
| `users.create`     | Invite/create staff                   |
| `users.update`     | Edit staff profiles/roles assignment  |
| `users.delete`     | Soft-delete staff                     |
| `users.lock`       | Lock/unlock accounts                  |
| `roles.read`       | View roles                            |
| `roles.manage`     | Create/update roles & permission maps |
| `permissions.read` | List permission catalog               |

### 3.2 Customers

| Permission         | Description                       |
| ------------------ | --------------------------------- |
| `customers.read`   | View customer PII (support/admin) |
| `customers.update` | Edit customer profile/status      |
| `customers.block`  | Block customer                    |
| `support.inbox`    | Contact messages                  |

### 3.3 Catalog

| Permission                                | Description                   |
| ----------------------------------------- | ----------------------------- |
| `products.read`                           | View products/variants admin  |
| `products.create`                         | Create products/variants      |
| `products.update`                         | Update products/media         |
| `products.delete`                         | Soft-delete products/variants |
| `products.publish`                        | Change publish status         |
| `categories.read` / `categories.manage`   | Category tree                 |
| `brands.read` / `brands.manage`           | Brands                        |
| `collections.read` / `collections.manage` | Collections                   |
| `attributes.manage`                       | Attributes                    |
| `colors.manage`                           | Colors                        |
| `sizes.manage`                            | Sizes                         |

### 3.4 Inventory

| Permission           | Description                |
| -------------------- | -------------------------- |
| `warehouses.read`    | View warehouses            |
| `warehouses.manage`  | CRUD warehouses            |
| `inventory.read`     | View stock & ledger        |
| `inventory.adjust`   | Manual adjustments         |
| `inventory.transfer` | Inter-warehouse transfer   |
| `inventory.update`   | Reserve/commit tools (ops) |

### 3.5 Orders & Shipping

| Permission        | Description                            |
| ----------------- | -------------------------------------- |
| `orders.read`     | View all orders                        |
| `orders.update`   | Status transitions (non-cancel/refund) |
| `orders.cancel`   | Cancel orders                          |
| `orders.refund`   | Issue refunds                          |
| `orders.export`   | Export order CSVs                      |
| `shipping.manage` | Create/update shipments                |
| `shipping.label`  | Generate labels (future)               |

### 3.6 Payments & Finance

| Permission           | Description                |
| -------------------- | -------------------------- |
| `payments.read`      | View payments/transactions |
| `payments.reconcile` | Manual reconcile           |
| `giftcards.read`     | View gift cards            |
| `giftcards.manage`   | Issue/disable gift cards   |
| `coupons.read`       | View coupons               |
| `coupons.manage`     | CRUD coupons               |

### 3.7 Content & Marketing

| Permission         | Description                  |
| ------------------ | ---------------------------- |
| `cms.manage`       | CMS pages                    |
| `banners.manage`   | Hero banners                 |
| `marketing.manage` | Campaigns & newsletter admin |
| `blogs.manage`     | Blog posts                   |
| `faqs.manage`      | FAQs                         |
| `reviews.moderate` | Approve/reject reviews       |
| `qa.manage`        | Answer/hide Q&A              |

### 3.8 Analytics & Platform

| Permission                | Description                |
| ------------------------- | -------------------------- |
| `analytics.view`          | Dashboards / event explore |
| `reports.view`            | View reports               |
| `reports.export`          | Export reports             |
| `settings.read`           | View settings              |
| `settings.manage`         | Change settings            |
| `audit.read`              | View audit logs            |
| `activity.read`           | View activity logs         |
| `notifications.broadcast` | Send admin broadcasts      |

### 3.9 Customer (Storefront) Permissions

| Permission          | Description                |
| ------------------- | -------------------------- |
| `account.read`      | Own profile                |
| `account.update`    | Own profile                |
| `orders.read_own`   | Own orders                 |
| `orders.cancel_own` | Cancel own eligible orders |
| `wishlist.manage`   | Own wishlist               |
| `reviews.create`    | Submit reviews             |
| `qa.create`         | Ask questions              |
| `addresses.manage`  | Own addresses              |

### 3.10 Guest Capability (Not DB Permissions)

Guests have **no** role row optionally; enforced as Public routes only:

- Browse catalog
- Create guest checkout session (rate limited)
- Subscribe newsletter / contact

---

## 4. Role → Permission Matrix

Legend: ● granted · ○ not granted · ◐ limited / scoped

| Permission                            | Super | Admin | Manager | Inv Mgr | Mkt Mgr | Support | Finance |  WH Staff   | Customer |
| ------------------------------------- | :---: | :---: | :-----: | :-----: | :-----: | :-----: | :-----: | :---------: | :------: |
| users.*                               |   ●   |   ●   |    ○    |    ○    |    ○    |    ○    |    ○    |      ○      |    ○     |
| roles.manage                          |   ●   |   ○   |    ○    |    ○    |    ○    |    ○    |    ○    |      ○      |    ○     |
| customers.read                        |   ●   |   ●   |    ●    |    ○    |    ◐    |    ●    |    ◐    |      ○      |    ○     |
| customers.update                      |   ●   |   ●   |    ○    |    ○    |    ○    |    ●    |    ○    |      ○      |    ○     |
| products.*                            |   ●   |   ●   |    ●    | ◐ read  | ◐ read  |    ○    |    ○    |      ○      |    ○     |
| categories/brands/collections.manage  |   ●   |   ●   |    ●    |    ○    |    ●    |    ○    |    ○    |      ○      |    ○     |
| inventory.read                        |   ●   |   ●   |    ●    |    ●    |    ○    |    ○    |    ○    |      ●      |    ○     |
| inventory.adjust                      |   ●   |   ●   |    ○    |    ●    |    ○    |    ○    |    ○    |      ●      |    ○     |
| inventory.transfer                    |   ●   |   ●   |    ○    |    ●    |    ○    |    ○    |    ○    |      ○      |    ○     |
| warehouses.manage                     |   ●   |   ●   |    ○    |    ●    |    ○    |    ○    |    ○    |      ○      |    ○     |
| orders.read                           |   ●   |   ●   |    ●    |    ●    |    ○    |    ●    |    ●    |      ●      |   own    |
| orders.update                         |   ●   |   ●   |    ●    |    ○    |    ○    |    ◐    |    ○    | ● pack/ship |    ○     |
| orders.cancel                         |   ●   |   ●   |    ●    |    ○    |    ○    |    ●    |    ○    |      ○      |   own    |
| orders.refund                         |   ●   |   ●   |    ○    |    ○    |    ○    |    ○    |    ●    |      ○      |    ○     |
| shipping.manage                       |   ●   |   ●   |    ●    |    ○    |    ○    |    ○    |    ○    |      ●      |    ○     |
| payments.read                         |   ●   |   ●   |    ○    |    ○    |    ○    |    ○    |    ●    |      ○      |    ○     |
| coupons.manage                        |   ●   |   ●   |    ○    |    ○    |    ●    |    ○    |    ○    |      ○      |    ○     |
| giftcards.manage                      |   ●   |   ●   |    ○    |    ○    |    ○    |    ○    |    ●    |      ○      |    ○     |
| cms/banners/blogs/faqs                |   ●   |   ●   |    ●    |    ○    |    ●    |    ○    |    ○    |      ○      |    ○     |
| marketing.manage                      |   ●   |   ●   |    ○    |    ○    |    ●    |    ○    |    ○    |      ○      |    ○     |
| reviews.moderate / qa.manage          |   ●   |   ●   |    ●    |    ○    |    ○    |    ●    |    ○    |      ○      |    ○     |
| reports.view / analytics.view         |   ●   |   ●   |    ●    |    ◐    |    ●    |    ○    |    ●    |      ○      |    ○     |
| settings.manage                       |   ●   |   ●   |    ○    |    ○    |    ○    |    ○    |    ○    |      ○      |    ○     |
| audit.read                            |   ●   |   ●   |    ○    |    ○    |    ○    |    ○    |    ●    |      ○      |    ○     |
| account.* / wishlist / reviews.create |   ○   |   ○   |    ○    |    ○    |    ○    |    ○    |    ○    |      ○      |    ●     |

> Exact seed JSON should mirror this matrix in implementation phase.

---

## 5. Enforcement Rules

1. **Deny by default** — missing permission → `403`.
2. **Resource scope** — `orders.read_own` may only access `customerId === token.customerId`.
3. **System roles** — `isSystem: true` cannot be deleted; permissions editable only by `super_admin`.
4. **Permission cache** — Redis key `rbac:role:{roleId}` TTL 5–15 min; invalidate on role update.
5. **Audit** — every `roles.manage`, `users.*`, `orders.refund`, `inventory.adjust`, `settings.manage` writes `audit_logs`.

---

## 6. Guest vs Customer Checkout

| Action             | Guest                      | Customer                  |
| ------------------ | -------------------------- | ------------------------- |
| Browse             | Yes                        | Yes                       |
| Wishlist           | No (local only)            | Yes                       |
| Place order        | Yes (email required)       | Yes                       |
| View order history | Via order token/email link | Yes                       |
| Reviews            | No                         | Yes (preferably verified) |

---

## Related

- [04-api-design.md](./04-api-design.md)
- [08-security.md](./08-security.md)
