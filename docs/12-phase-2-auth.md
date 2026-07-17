# Phase 2 — Authentication & Authorization

Enterprise auth implemented in `apps/api`. No products/orders/payments/frontend.

## Seed (required once)

```bash
# Start MongoDB (+ Redis recommended for token blacklist)
pnpm docker:infra

pnpm --filter @fe-platform/api seed:auth
```

Default super admin (change immediately):

- Email: `admin@feplatform.com`
- Password: `ChangeMe!123`

Override via `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`.

## Endpoints (`/api/v1/auth`)

| Method | Path                   | Auth                                     |
| ------ | ---------------------- | ---------------------------------------- |
| POST   | `/register`            | Public                                   |
| POST   | `/login`               | Public (`portal`: `customer` \| `admin`) |
| POST   | `/logout`              | Optional                                 |
| POST   | `/logout-all`          | Required                                 |
| POST   | `/refresh`             | Refresh cookie/body                      |
| POST   | `/forgot-password`     | Public                                   |
| POST   | `/reset-password`      | Public                                   |
| POST   | `/change-password`     | Required                                 |
| POST   | `/verify-email`        | Public                                   |
| POST   | `/resend-verification` | Public                                   |
| GET    | `/me`                  | Required                                 |

## Security features

- Argon2id passwords + strength rules + password history
- Access JWT + opaque refresh tokens with rotation + reuse detection
- Redis access-token blacklist on logout
- Device sessions, remember-me expiry, IP/UA logging
- Account lockout after failed attempts
- Email verification required before login
- Rate-limited auth routes
- Audit + activity logs for auth events

## Middleware

- `authenticate` / `optionalAuth`
- `authorize` / `requirePermission`
- `requireRole`

## Google OAuth

Structure only: `src/services/oauth/google.oauth.ts` (stub).

## Email templates

Welcome, verify email, forgot password, password changed, login alert — under `src/emails/templates/`.
