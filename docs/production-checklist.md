# Production Readiness Checklist

Use this checklist before go-live. All items should be verified in staging with production-like configuration.

## Security

- [ ] `PRODUCTION_STRICT=true` and API boots without env validation errors
- [ ] JWT, cookie, and payment secrets rotated from development defaults
- [ ] `COOKIE_SECURE=true`, `COOKIE_SAME_SITE` appropriate for cross-site needs
- [ ] `CORS_ORIGINS` lists only production storefront and admin origins
- [ ] Swagger disabled (`SWAGGER_ENABLED=false`) or IP-restricted
- [ ] TLS enabled on all public endpoints
- [ ] nginx/API security headers verified (CSP, HSTS at edge, `X-Content-Type-Options`)
- [ ] Rate limiting validated under load (consider Redis-backed store for multi-instance)
- [ ] File upload MIME whitelist and size limits confirmed
- [ ] Webhook signature secrets configured for live payment gateways
- [ ] Admin surface blocked from indexing (`noindex`, `X-Robots-Tag`)
- [ ] `pnpm audit:prod` reviewed; no unmitigated high/critical issues

## Application

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass in CI
- [ ] API security suite passes (`pnpm test:security`)
- [ ] Health/readiness probes wired to orchestrator
- [ ] Graceful shutdown verified (`SHUTDOWN_TIMEOUT_MS`)
- [ ] Error responses do not leak stack traces in production
- [ ] RBAC permissions verified for admin roles

## Data & infrastructure

- [ ] MongoDB backups scheduled and restore tested
- [ ] Redis persistence/HA strategy documented
- [ ] S3 bucket policy and CDN origin configured
- [ ] Log aggregation shipping configured (JSON logs + request IDs)
- [ ] Monitoring alerts configured (see monitoring guide)

## Frontends

- [ ] `VITE_API_URL` and `VITE_SITE_URL` point to production URLs
- [ ] PWA manifest and service worker tested (web)
- [ ] `robots.txt` and `sitemap.xml` published
- [ ] Core checkout and account flows smoke-tested
- [ ] Accessibility spot-check: keyboard nav, skip links, form labels

## Operations

- [ ] Runbook shared with on-call rotation
- [ ] Deployment run executed successfully in staging
- [ ] Rollback procedure tested once
- [ ] Sign-off recorded (product, engineering, ops)

## Sign-off

| Role        | Name | Date |
| ----------- | ---- | ---- |
| Engineering |      |      |
| DevOps      |      |      |
| Security    |      |      |
| Product     |      |      |
