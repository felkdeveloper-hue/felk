# FE Platform

Enterprise fashion eCommerce monorepo — storefront, admin, and API.

Built for production scale: Turborepo, React 19, Express, MongoDB, Redis, and modern DX tooling.

> **Status:** Foundation only. Feature modules will be built incrementally.

---

## Monorepo structure

```
fe-platform/
├── apps/
│   ├── web/          # Customer storefront (React 19 + Vite + TanStack)
│   ├── admin/        # Admin dashboard (React 19 + Vite + TanStack)
│   └── api/          # REST API (Express + MongoDB + Redis)
├── packages/
│   ├── ui/           # Shared UI (shadcn/ui)
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared helpers
│   ├── config/       # Shared constants
│   ├── eslint-config/
│   └── tsconfig/
├── docker/           # Dockerfiles + Compose
├── docs/             # Architecture docs
├── scripts/          # Utility scripts
└── .github/          # CI workflows
```

## Tech stack

| Layer              | Stack                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Storefront / Admin | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Router & Query, RHF, Zod, Zustand, Framer Motion, Axios |
| API                | Node.js, Express, MongoDB, Mongoose, JWT + Refresh Tokens, Redis, BullMQ, Socket.io, Multer, Sharp, Nodemailer           |
| Tooling            | Turborepo, pnpm, ESLint 9, Prettier, Husky, lint-staged, Commitlint                                                      |
| Deploy             | Docker, Docker Compose, AWS S3 ready, Cloudflare ready                                                                   |

## Prerequisites

- Node.js **20+**
- pnpm **9+** (`corepack enable`)
- Docker (optional, for MongoDB/Redis)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env

# 3. Local infra (MongoDB + Redis)
pnpm docker:up
# or infra only:
docker compose -f docker/docker-compose.dev.yml up -d

# 4. Develop (all apps)
pnpm dev

# Or individually:
pnpm dev:web    # http://localhost:5173
pnpm dev:admin  # http://localhost:5174
pnpm dev:api    # http://localhost:4000
```

## Scripts

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `pnpm dev`         | Run all apps in parallel        |
| `pnpm build`       | Build all packages & apps       |
| `pnpm lint`        | Lint entire monorepo            |
| `pnpm typecheck`   | TypeScript check                |
| `pnpm format`      | Prettier format                 |
| `pnpm docker:up`   | Start full Docker Compose stack |
| `pnpm docker:down` | Stop Docker stack               |

## Architecture standards

- **Feature-based** organisation inside each app
- **Absolute imports** via `@/` aliases — no deep relative paths
- **Barrel exports** (`index.ts`) per folder
- **Thin controllers** → business logic in **services** → data access in **repositories**
- **Zod schemas** for validation; TypeScript everywhere

## Planned data model (placeholders only)

Users, Roles, Permissions, Products, Categories, Brands, Collections, Variants, Inventory, Warehouses, Orders, OrderItems, Payments, Transactions, Coupons, Reviews, Wishlists, Addresses, Notifications, CMS, Blogs, Settings, Analytics, AuditLogs

## Path aliases

### Web / Admin

```
@/* → src/*
```

### API

```
@/*              → src/*
@/config/*       → src/config/*
@/controllers/*  → src/controllers/*
@/services/*     → src/services/*
@/repositories/* → src/repositories/*
...
```

## Commit convention

Conventional Commits enforced via Commitlint:

```
feat: add product listing page
fix: resolve cart quantity race
chore: bump turbo version
```

## License

Private — All rights reserved.

## Architecture docs

Full system blueprint (design only):

→ [`docs/README.md`](./docs/README.md)
