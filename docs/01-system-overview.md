# 01 — System Overview

> **FE Platform** — Enterprise fashion eCommerce platform  
> Status: Architecture design (pre-implementation)  
> Horizon: Maintainable for 5–10 years · Scale target: millions of users

---

## 1. Purpose

FE Platform is a multi-tenant-ready fashion eCommerce system with:

- Customer storefront (`apps/web`)
- Admin / operations console (`apps/admin`)
- Stateless REST API + real-time sockets (`apps/api`)

This document is the **north-star blueprint**. Implementation follows these docs module by module. No business logic is defined here beyond architectural contracts.

---

## 2. Design Principles

| Principle                       | Rule                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Clean Architecture              | Controllers thin → Services own rules → Repositories own persistence                                |
| Feature modules                 | Domain boundaries map 1:1 to folders and ownership                                                  |
| Event-driven side effects       | Emails, inventory history, analytics via queues/events — not inline in request path where avoidable |
| Idempotency                     | Payments, webhooks, inventory reservations must be idempotent                                       |
| Soft delete by default          | Business entities use `deletedAt` / `isDeleted`; hard delete only for purge jobs                    |
| Audit everything sensitive      | Auth, money, inventory, RBAC changes → audit logs                                                   |
| API versioning                  | `/api/v1` forever-stable contract; breaking changes → `/api/v2`                                     |
| Read/write separation readiness | Query shapes designed so secondary read replicas / search indexes can be introduced later           |
| Zero secrets in code            | Env + secret manager; rotate JWT/webhook secrets without redeploy where possible                    |

---

## 3. High-Level Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   apps/web       │     │   apps/admin      │
│   Storefront     │     │   Ops Console     │
└────────┬─────────┘     └────────┬─────────┘
         │ HTTPS / WSS            │
         └────────────┬───────────┘
                      ▼
              ┌───────────────┐
              │   CDN / WAF   │  (Cloudflare-ready)
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │   apps/api    │  Express · JWT · RBAC
              │  Load-balanced│
              └───┬───────┬───┘
          ┌───────┘       └───────┐
          ▼                       ▼
   ┌─────────────┐         ┌─────────────┐
   │   MongoDB   │         │    Redis    │
   │  Primary +  │         │ Cache ·     │
   │  Secondary  │         │ Sessions ·  │
   │  (future)   │         │ BullMQ ·    │
   └─────────────┘         │ Rate limits │
                           └──────┬──────┘
                                  ▼
                           ┌─────────────┐
                           │  Workers    │
                           │  BullMQ     │
                           └──────┬──────┘
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
            Email/SMS      Image pipeline    Webhooks
            (Nodemailer)   (Sharp · S3)      (Gateways)
```

---

## 4. Runtime Components

| Component          | Responsibility                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **API servers**    | HTTP REST, auth, RBAC, orchestration                                                      |
| **Socket servers** | Live order status, admin alerts, stock flashes (same Node process initially; extractable) |
| **MongoDB**        | System of record for catalog, orders, users, CMS                                          |
| **Redis**          | Refresh-token denylist / session store, rate limits, cache, BullMQ broker                 |
| **Workers**        | Emails, invoice PDF, image resize, analytics rollups, stock alerts                        |
| **Object storage** | Product media, invoices, exports (AWS S3 / R2)                                            |
| **CDN**            | Static assets & media                                                                     |

---

## 5. Bounded Contexts (Domain Map)

| Context          | Owns                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| **Identity**     | Auth, Users, Roles, Permissions, Sessions, Devices                             |
| **CRM**          | Customers, Addresses, Wishlist, Contact, Newsletter                            |
| **Catalog**      | Products, Variants, Categories, Brands, Collections, Attributes, Colors, Sizes |
| **Inventory**    | Warehouses, Stock ledgers, Reservations, Alerts                                |
| **Commerce**     | Cart (future), Orders, Order Items, Coupons, Gift Cards                        |
| **Payments**     | Payments, Transactions, Gateways, Webhooks, Refunds                            |
| **Fulfillment**  | Shipping, Packaging statuses, Tracking                                         |
| **Engagement**   | Reviews, Q&A, Notifications, Blogs, FAQs                                       |
| **Content**      | CMS, Hero Banners, Marketing slots                                             |
| **Intelligence** | Analytics events, Reports                                                      |
| **Platform**     | Settings, Audit Logs, Activity Logs                                            |

Contexts communicate via **service calls** inside the monolith and **domain events** on the queue for async work. Physical repo remains a modular monolith until extraction is justified.

---

## 6. Scalability Posture (Millions of Users)

| Concern               | Strategy (now → later)                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Horizontal API        | Stateless JWT; sticky sessions only if sockets need it → Socket.io Redis adapter             |
| Catalog reads         | Indexed Mongo queries → Redis cache → Search engine (OpenSearch) later                       |
| Inventory correctness | Atomic reserved/available counters + ledger history; optimistic concurrency / version fields |
| Order spikes          | Idempotent create; inventory reserve in transaction; payment async via webhook               |
| Media                 | Upload → queue resize → S3; CDN URLs in DB                                                   |
| Reporting             | Append-only analytics events; nightly aggregates; never OLTP for heavy reports               |
| Multi-region          | Single region initially; shard key guidance documented for `orders` / `users` later          |

---

## 7. Non-Functional Requirements

| NFR                    | Target                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| API p95 (catalog read) | < 200 ms (cached)                                                         |
| API p95 (order create) | < 500 ms                                                                  |
| Auth token lifetimes   | Access 15m · Refresh 7–30d (configurable)                                 |
| Availability           | 99.9% API (infra-dependent)                                               |
| Data retention         | Soft-deleted retained 30–90d then purge job                               |
| Observability          | Structured logs, request IDs, audit trail, metrics (future OpenTelemetry) |

---

## 8. Document Index

| Doc                                                      | Contents                                    |
| -------------------------------------------------------- | ------------------------------------------- |
| [02-database-design.md](./02-database-design.md)         | Every collection, fields, indexes, examples |
| [03-module-architecture.md](./03-module-architecture.md) | Module boundaries & internal layers         |
| [04-api-design.md](./04-api-design.md)                   | REST contracts                              |
| [05-rbac.md](./05-rbac.md)                               | Roles & permissions matrix                  |
| [06-payment-flow.md](./06-payment-flow.md)               | Gateways, webhooks, failures                |
| [07-order-flow.md](./07-order-flow.md)                   | Order lifecycle                             |
| [08-security.md](./08-security.md)                       | AuthN/Z, hardening                          |
| [09-folder-guidelines.md](./09-folder-guidelines.md)     | Backend folder rules                        |
| [10-development-roadmap.md](./10-development-roadmap.md) | Phased build order                          |

---

## 9. Explicit Out of Scope (This Phase)

- No Mongoose models
- No controllers / routes / services implementation
- No frontend pages
- No authentication implementation
- No payment gateway SDKs wired

**This phase finalizes the blueprint only.**
