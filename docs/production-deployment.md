# Production Deployment Guide

This guide describes how to deploy the FE Platform commerce stack (`apps/api`, `apps/web`, `apps/admin`) to production without changing application architecture.

## Architecture overview

| Service | Runtime            | Port  | Health                     |
| ------- | ------------------ | ----- | -------------------------- |
| API     | Node.js 20         | 4000  | `GET /api/v1/health/ready` |
| Web     | nginx (static SPA) | 80    | HTTP 200 on `/`            |
| Admin   | nginx (static SPA) | 80    | HTTP 200 on `/`            |
| MongoDB | mongo:7            | 27017 | `mongosh ping`             |
| Redis   | redis:7-alpine     | 6379  | `redis-cli ping`           |

## Prerequisites

- Node.js 20+, pnpm 9+
- MongoDB 7 (managed or self-hosted)
- Redis 7 (managed or self-hosted)
- TLS termination (load balancer, Cloudflare, or reverse proxy)
- Object storage (S3-compatible) for media uploads in production

## Build-time vs runtime configuration

### API (runtime)

Set via environment variables validated in `apps/api/src/config/env.ts`:

- `NODE_ENV=production`
- `PRODUCTION_STRICT=true` (enforces non-default secrets, secure cookies, non-localhost CORS)
- `JWT_ACCESS_SECRET`, `COOKIE_SECRET`, payment webhook secrets
- `COOKIE_SECURE=true`
- `CORS_ORIGINS=https://your-store.com,https://admin.your-store.com`
- `MONGODB_URI`, `REDIS_URL`
- `TRUST_PROXY=1` (or hop count behind your load balancer)
- `SWAGGER_ENABLED=false`
- `CSRF_ENABLED=true` if browser clients use cookie auth for mutations

### Frontends (build-time)

Vite embeds `VITE_*` variables at build time:

```bash
VITE_API_URL=https://api.your-store.com/api/v1 \
VITE_SITE_URL=https://your-store.com \
VITE_APP_NAME="Your Store" \
pnpm --filter @fe-platform/web build

VITE_API_URL=https://api.your-store.com/api/v1 \
VITE_APP_NAME="Your Store Admin" \
pnpm --filter @fe-platform/admin build
```

## Docker deployment

Build images from repository root:

```bash
docker build -f docker/Dockerfile.api -t fe-platform-api:latest .
docker build -f docker/Dockerfile.web -t fe-platform-web:latest \
  --build-arg VITE_API_URL=https://api.example.com/api/v1 \
  --build-arg VITE_SITE_URL=https://example.com .
docker build -f docker/Dockerfile.admin -t fe-platform-admin:latest \
  --build-arg VITE_API_URL=https://api.example.com/api/v1 .
```

Images include:

- Non-root API process (UID 1001)
- nginx security headers on frontends
- Docker `HEALTHCHECK` directives

For local full-stack smoke:

```bash
pnpm docker:build
pnpm docker:up
```

## Recommended production topology

1. **Edge**: CDN + WAF + TLS (Cloudflare or ALB)
2. **Web/Admin**: Static hosting or nginx containers behind CDN
3. **API**: Container service with autoscaling, private network to MongoDB/Redis
4. **Data**: Managed MongoDB + Redis with backups and persistence
5. **Media**: S3 bucket with public read via CDN origin

## Post-deploy smoke checks

1. `curl -f https://api.example.com/api/v1/health/ready`
2. `curl -f https://example.com/robots.txt`
3. Login to admin with staff account
4. Place test order in sandbox payment mode
5. Verify `x-request-id` header on API responses

## Rollback

- **API**: redeploy previous container image tag
- **Frontends**: redeploy previous static asset bundle (keep prior Docker image)
- **Database**: restore from backup only if schema/data migration failed (see backup guide)

## Vercel + Render deployment

### Frontends (Vercel)

1. Create one Vercel project per app with **Root Directory** `apps/web` or `apps/admin`.
2. Framework preset: Vite. Output directory: `dist`.
3. Each app includes `vercel.json` with an SPA rewrite so client routes (e.g. `/login`, `/products`) do not 404.
4. Set build-time env vars (then **Redeploy** — Vite embeds them at build):

| Variable              | Example                                 |
| --------------------- | --------------------------------------- |
| `VITE_API_URL`        | `https://felk-mq41.onrender.com/api/v1` |
| `VITE_SOCKET_URL`     | `https://felk-mq41.onrender.com`        |
| `VITE_SITE_URL` (web) | `https://felk-web.vercel.app`           |
| `VITE_APP_NAME`       | Your brand / admin title                |

If `VITE_API_URL` is set to the API origin without `/api/v1`, the apps append `/api/v1` automatically.

### API (Render)

Allow both Vercel origins (comma-separated, no spaces preferred):

```text
CORS_ORIGINS=https://felk-web.vercel.app,https://felk-admin.vercel.app
```

For cross-site cookie auth (Vercel ↔ Render), also use:

```text
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

Restart/redeploy the API after changing env vars.

## Related documents

- [Production Checklist](./production-checklist.md)
- [Runbook](./runbook.md)
- [Monitoring Guide](./monitoring.md)
- [Backup & Disaster Recovery](./backup-disaster-recovery.md)
