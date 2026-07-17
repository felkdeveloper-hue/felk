# 09 — Folder Guidelines (API)

> Rules for organizing `apps/api` so the codebase stays navigable for 5–10 years.

---

## 1. Current Scaffold vs Target

**Today (foundation):** layered folders at `apps/api/src/`  
**Target (as modules land):** feature modules under `apps/api/src/modules/<feature>/` while keeping shared `middlewares/`, `config/`, `utils/`.

Both are valid; migrate incrementally **per module** without big-bang rewrites.

---

## 2. Directory Responsibilities

| Path                          | Allowed                                      | Forbidden                          |
| ----------------------------- | -------------------------------------------- | ---------------------------------- |
| `config/`                     | Env, DB, Redis, CORS                         | Business rules                     |
| `middlewares/`                | Auth, RBAC, rate limit, validate, request-id | DB writes                          |
| `modules/*` or `controllers/` | Thin HTTP adapters                           | Pricing / stock math               |
| `services/`                   | Business logic                               | Express types                      |
| `repositories/`               | Queries/mutations                            | Calling other services             |
| `models/`                     | Mongoose schemas only                        | Controllers                        |
| `schemas/`                    | Zod contracts                                | Side effects                       |
| `validators/`                 | Re-exports / compose schema → middleware     | SQL/Mongo                          |
| `queues/`                     | Job definitions                              | HTTP                               |
| `events/`                     | Event bus helpers                            | Persistence                        |
| `emails/`                     | Templates                                    | Order status transitions           |
| `storage/`                    | S3/local adapters                            | Auth                               |
| `cron/`                       | Schedules                                    | Request handlers                   |
| `sockets/`                    | WS handlers                                  | Heavy processing (enqueue instead) |
| `scripts/`                    | One-off / seed / migrate                     | Production request path            |
| `logs/` / `uploads/`          | Runtime artifacts                            | Source of truth                    |

---

## 3. Naming Conventions

| Kind       | Pattern                              | Example                 |
| ---------- | ------------------------------------ | ----------------------- |
| Model file | `<entity>.model.ts`                  | `product.model.ts`      |
| Repository | `<entity>.repository.ts`             | `product.repository.ts` |
| Service    | `<entity>.service.ts`                | `order.service.ts`      |
| Controller | `<entity>.controller.ts`             | `order.controller.ts`   |
| Routes     | `<entity>.routes.ts`                 | `order.routes.ts`       |
| Zod schema | `<entity>.schema.ts`                 | `checkout.schema.ts`    |
| Constants  | `UPPER_SNAKE` or typed const objects | `ORDER_STATUS`          |
| Events     | `domain.action`                      | `order.paid`            |

---

## 4. Import Rules

1. **Absolute aliases only** — `@/services/order.service` not `../../../`
2. **Barrel exports** — each folder exposes `index.ts` for public API
3. **No cross-feature deep imports** — import from feature barrel
4. **Types:** prefer `import type` for type-only imports

---

## 5. Soft Layering Checklist (PR Review)

- [ ] Controller < ~40 lines for happy path
- [ ] Service has no `req` / `res`
- [ ] Repository has no business `if` beyond query shaping
- [ ] Money/inventory mutations produce ledger/audit entries
- [ ] External I/O (email, S3, gateway) behind adapters + queues when slow

---

## 6. Document Placement

| Doc                 | Location                 |
| ------------------- | ------------------------ |
| Architecture        | `docs/01`–`10`           |
| Module ADRs (later) | `docs/adr/NNNN-title.md` |
| OpenAPI (later)     | `docs/openapi/v1.yaml`   |

---

## 7. What Not to Add Early

- Microservices split
- GraphQL (REST first)
- CQRS complexity unless a report is proven hot
- Shared “god” `helpers.ts` dumping ground — prefer named utility files
