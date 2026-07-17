# Operations Runbook

Quick reference for common production incidents.

## Severity levels

| Level | Examples                                    | Response             |
| ----- | ------------------------------------------- | -------------------- |
| SEV-1 | Checkout down, payments failing, data loss  | Immediate, all-hands |
| SEV-2 | Admin unavailable, elevated 5xx, Redis down | < 30 min             |
| SEV-3 | Degraded performance, non-critical feature  | Next business day    |

## Health checks

```bash
# Liveness
curl -s https://api.example.com/api/v1/health

# Readiness (Mongo + Redis)
curl -s https://api.example.com/api/v1/health/ready

# Metrics (operational)
curl -s https://api.example.com/api/v1/metrics
```

## API returns 503 on `/health/ready`

1. Check MongoDB connectivity from API network
2. Check Redis connectivity
3. Review API logs filtered by `requestId` from failing probe
4. Restart API pods/containers after dependency recovery
5. API may start in degraded mode if DB unavailable at boot — readiness should remain 503 until recovered

## Elevated 5xx error rate

1. Check recent deployments — rollback if correlated
2. Search logs: `{ "level": "error" }` with `requestId`
3. Verify MongoDB/Redis latency and connection pool exhaustion
4. Check rate-limit false positives behind proxy (`TRUST_PROXY` hops)
5. Scale API horizontally if CPU/memory saturated

## Payment webhooks failing

1. Confirm webhook URL reachable from gateway IPs
2. Verify live merchant secrets (`PAYHERE_*`, `KOKO_*`, `MINTPAY_*`, `COD_WEBHOOK_SECRET`)
3. Inspect idempotency/replay logs in payment service audit trail
4. Reconcile stuck payments via admin finance module

## Admin login failures

1. Verify staff user role and status in MongoDB
2. Check CORS and cookie settings (`COOKIE_SECURE`, domain, SameSite)
3. Confirm `VITE_API_URL` on admin build matches API origin
4. Review auth rate-limit logs for lockouts

## Frontend blank page after deploy

1. Verify nginx serving `index.html` fallback
2. Check browser console for wrong `VITE_API_URL`
3. Confirm CDN cache invalidation for `index.html`
4. Roll back to previous static bundle

## Tracing a request

1. Capture `x-request-id` / `x-correlation-id` from client or gateway
2. Search API logs for that ID
3. Cross-reference audit log entries with same `requestId`

## Secret rotation

| Secret                 | Impact                               | Procedure                                |
| ---------------------- | ------------------------------------ | ---------------------------------------- |
| JWT access secret      | All sessions invalidated             | Rotate, redeploy API, force re-login     |
| Cookie secret          | Signed cookies invalid               | Rotate during maintenance window         |
| Payment webhook secret | Gateway callbacks fail until updated | Update gateway dashboard + env, redeploy |

## Escalation

Document your team contacts here before go-live:

- Primary on-call: ___
- Secondary on-call: ___
- Infrastructure: ___
