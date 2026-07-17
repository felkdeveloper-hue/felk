# 10 — Development Roadmap

> Phased delivery. Each phase ends with mergeable, tested increments. **Design is complete when docs 01–09 are accepted.**

---

## Phase 0 — Foundation (DONE)

- [x] Turborepo monorepo
- [x] Apps: web, admin, api scaffolds
- [x] Shared packages, Docker, CI tooling
- [x] Architecture documents (this set)

---

## Phase 1 — Platform Core

**Goal:** Secure API shell without storefront features.

1. [x] Env validation, logging, request IDs
2. [x] Mongo + Redis connection hardening
3. [x] Error envelope standardization
4. [x] Base middlewares: Helmet, CORS, rate limit, compression
5. [x] Shared utils, constants, types, service interfaces
6. [x] Swagger / OpenAPI shell, health + version, graceful shutdown
7. [ ] Settings collection + seed defaults _(deferred — not in Phase 1 build list)_
8. [ ] Audit log writer utility _(deferred — pairs with Phase 2)_

**Exit:** Health + version + docs live; every response includes `x-request-id`. Auth/RBAC middlewares are **stubs only**.

---

## Phase 2 — Identity & RBAC

1. [x] Users / Roles / Permissions models
2. [x] JWT access + opaque refresh (rotation, reuse detection)
3. [x] Device sessions + logout/revoke (+ logout all)
4. [x] Password hashing (Argon2), lockout, email verification / reset
5. [x] RBAC middleware (`permission` / `role` checks)
6. [x] Super Admin seed

**Exit:** Staff/customers can authenticate; permission-gated middleware works.  
**Note:** Storefront UI still deferred. Google OAuth is structure-only.

---

## Phase 3 — Catalog Master Data + CMS

1. [x] Brands, Colors, Sizes, Materials, Tags, Occasions, Seasons
2. [x] Categories (tree / subcategories)
3. [x] Collections
4. [ ] Products + Variants + media pipeline _(deferred — next product phase)_
5. [x] CMS: banners, pages (versioned), blogs, FAQs, home sections
6. [x] Settings: store/SEO/contact/social/shipping/tax/currency/templates

**Exit:** Admin can manage full CMS + master data via API (no products yet).

---

## Phase 4 — Inventory

1. Warehouses
2. Inventory balances + ledger
3. Reserve / release / commit APIs
4. Low-stock alerts (queue)

**Exit:** Variant availability is warehouse-aware and auditable.

---

## Phase 5 — Customers & Addresses

1. Customer profile linkage
2. Address book
3. Wishlist
4. Newsletter / contact inbox

**Exit:** Customer profile APIs ready for storefront.

---

## Phase 6 — Cart & Checkout Contracts

1. Cart (if persisted) or checkout session
2. Coupon engine (basic)
3. Gift card redeem (basic)
4. Order create + inventory reserve
5. Address validation rules

**Exit:** Order can be created in `awaiting_payment` with stock reserved.

---

## Phase 7 — Payments

1. Payment + Transaction models
2. COD path
3. PayHere / Koko / Mintpay adapters + webhooks
4. Signature verification, idempotency
5. Invoice job + email

**Exit:** Paid orders commit stock; failures release stock.

---

## Phase 8 — Fulfillment

1. Order status machine enforcement
2. Shipping records + tracking
3. Customer/admin notifications

**Exit:** Packed → Shipped → Delivered path complete.

---

## Phase 9 — Engagement & Content

1. Reviews + moderation
2. Q&A
3. CMS pages, hero banners
4. Blogs, FAQs
5. Marketing slots

**Exit:** Content and social proof APIs live.

---

## Phase 10 — Analytics, Reports, Hardening

1. Analytics event pipeline
2. Report exports
3. Activity logs polish
4. Load tests on catalog + checkout
5. Security review (see 08)

**Exit:** Production readiness checklist signed off.

---

## Parallel Frontend Tracks (Separate)

| Track                    | Starts after |
| ------------------------ | ------------ |
| Admin shell + catalog UI | Phase 3      |
| Admin orders / inventory | Phase 4–8    |
| Storefront catalog       | Phase 3      |
| Storefront checkout      | Phase 6–7    |

Frontend must **not** block API contract finalization.

---

## Definition of Done (Any Module)

- [ ] Zod schemas documented in OpenAPI or `docs`
- [ ] Indexes applied as per 02
- [ ] RBAC permissions registered in 05
- [ ] Audit events for mutations
- [ ] Unit tests for service invariants
- [ ] No deep relative imports
- [ ] Soft delete + timestamps where required

---

## Risk Register (Architecture)

| Risk                | Mitigation                                     |
| ------------------- | ---------------------------------------------- |
| Inventory oversell  | Reserve on order create; TTL release job       |
| Webhook replay      | Idempotency keys + signature + processed store |
| Refresh token theft | Rotation + family revoke                       |
| Catalog hot keys    | Cache + eventual search index                  |
| God services        | Enforce module boundaries in review            |

---

## Immediate Next Coding Step (When Approved)

Implement **Phase 1** only — still no auth business productization until Phase 2.  
Do not skip ahead to payments or storefront pages.
