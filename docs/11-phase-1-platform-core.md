# Phase 1 — Platform Core (Implemented)

Infrastructure delivered in `apps/api`. No business modules.

## Endpoints

| Method | Path                   | Purpose                 |
| ------ | ---------------------- | ----------------------- |
| GET    | `/`                    | API root metadata       |
| GET    | `/api/v1/health`       | Liveness                |
| GET    | `/api/v1/health/ready` | Mongo + Redis readiness |
| GET    | `/api/v1/version`      | Version metadata        |
| GET    | `/api/docs`            | Swagger UI              |

Every response includes header `x-request-id`.

## Key locations

| Area                  | Path                       |
| --------------------- | -------------------------- |
| Config / env / logger | `src/config/`              |
| Middlewares           | `src/middlewares/`         |
| Utils & helpers       | `src/utils/`               |
| Constants             | `src/constants/`           |
| Types                 | `src/types/`               |
| Service interfaces    | `src/services/interfaces/` |
| Zod common schemas    | `src/schemas/`             |

## Auth stubs

`authenticate`, `authorize`, `requireRoles`, `requirePermissions` return `401/403` with `*_NOT_IMPLEMENTED` until Phase 2.
