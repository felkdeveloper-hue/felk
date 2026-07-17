# Backup & Disaster Recovery

## Recovery objectives (adjust per business requirements)

| Tier            | RTO      | RPO           | Scope                                  |
| --------------- | -------- | ------------- | -------------------------------------- |
| API + frontends | 1 hour   | 0 (stateless) | Redeploy images/assets                 |
| MongoDB         | 4 hours  | 15 min        | Orders, catalog, customers             |
| Redis           | 1 hour   | 1 hour        | Sessions, rate limits, token blacklist |
| S3 media        | 24 hours | 24 hours      | Product images                         |

## MongoDB

### Backup strategy

- **Managed (Atlas/DocumentDB)**: enable continuous cloud backup + point-in-time restore
- **Self-hosted**: daily `mongodump` to encrypted object storage; retain 30 days

```bash
mongodump --uri="$MONGODB_URI" --archive=backup-$(date +%F).gz --gzip
```

### Restore test

Quarterly restore to staging cluster and verify:

- User auth works
- Recent orders readable
- Catalog integrity

## Redis

Redis holds ephemeral data (sessions, rate limits, JWT blacklist). Treat as **cache tier**:

- Enable AOF persistence if session stickiness matters
- On total loss: users re-authenticate; rate limits reset
- No business-critical permanent data should be Redis-only

## Object storage (S3)

- Enable versioning on product media bucket
- Cross-region replication for DR (optional)
- Lifecycle policy: transition old versions to IA after 90 days

## Application artifacts

- Store Docker images in registry with immutable tags (`git sha`, semver)
- Retain last 10 frontend build artifacts for rollback
- Document deployment tag in change log

## Disaster scenarios

### Single AZ / node failure

- Orchestrator restarts containers
- Readiness probe removes unhealthy instances
- No manual action if multi-AZ data layer

### Region loss

- Promote DR MongoDB replica (if configured)
- Update DNS to DR API/frontends
- Replay missed webhooks from payment gateways if needed

### Data corruption

- Stop writes (maintenance mode flag via CMS settings or load balancer)
- Restore MongoDB from last known-good backup
- Reconcile payment/order state against gateway records

### Ransomware / credential compromise

1. Rotate all secrets (`PRODUCTION_STRICT` checklist)
2. Invalidate all refresh tokens (DB cleanup + JWT blacklist flush)
3. Redeploy from known-good images
4. Forensics on audit logs (`writeAuditLog` entries)

## DR drill cadence

- **Monthly**: backup verification (restore to isolated env)
- **Quarterly**: full failover tabletop exercise
- **Annually**: region failover test (if multi-region)
