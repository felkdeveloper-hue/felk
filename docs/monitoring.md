# Monitoring Guide

## Observability stack (recommended)

| Layer   | Tool examples             | FE Platform hooks                |
| ------- | ------------------------- | -------------------------------- |
| Logs    | CloudWatch, Datadog, Loki | Pino JSON logs, `x-request-id`   |
| Metrics | Prometheus, Datadog       | `GET /api/v1/system/metrics`     |
| Uptime  | Pingdom, Better Stack     | `/health/ready` synthetic checks |
| APM     | Datadog, New Relic        | Optional middleware hook point   |
| Errors  | Sentry                    | Client + server error boundaries |

## API logging

- Access logs emitted via Morgan → Pino in production
- Error handler logs include `requestId` and `correlationId`
- Sensitive fields redacted in `apps/api/src/config/logger.ts`

### Log fields to index

- `requestId`
- `level`
- `msg`
- `err.code` (API errors)
- HTTP method/path/status (access logs)

## Health probes (Kubernetes example)

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 4000
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 4000
  periodSeconds: 10
  failureThreshold: 3
```

## Metrics endpoint

`GET /api/v1/metrics` returns:

- `uptimeSeconds`
- `memory` (rss, heap)
- `cpu` usage delta
- `version`, `node`, `pid`

Scrape interval: 30–60s. Alert on:

- Readiness failures > 2 min
- Memory RSS growth trend
- 5xx rate > 1% over 5 min

## Frontend monitoring

- Track Core Web Vitals via RUM (optional)
- Monitor CDN 4xx/5xx for static assets
- Alert on checkout success rate drop

## Synthetic checks

Schedule every 5 minutes:

1. API readiness
2. Web homepage 200
3. Admin login page 200 (no auth required)
4. Optional: k6 smoke (`apps/api/src/test/load/k6-smoke.js`)

## Alerting thresholds (starting point)

| Alert        | Condition                                  |
| ------------ | ------------------------------------------ |
| API down     | readiness non-200 for 3 consecutive checks |
| High latency | p95 API > 2s for 10 min                    |
| Error spike  | 5xx > 50/min                               |
| Disk/memory  | container memory > 85% for 15 min          |

## Performance smoke tests

```bash
pnpm --filter @fe-platform/api test:performance
node apps/api/src/test/load/load-test.mjs  # against running API
```

## Future enhancements

- OpenTelemetry tracing (spans from request ID)
- Prometheus `/metrics` text format exporter
- Sentry SDK integration in web/admin error boundaries
