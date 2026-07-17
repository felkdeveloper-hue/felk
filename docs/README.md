# FE Platform Documentation

Architecture blueprint for the enterprise fashion eCommerce platform.

> **Design phase complete.** No implementation lives in these docs.

| #   | Document                                           | Contents                                           |
| --- | -------------------------------------------------- | -------------------------------------------------- |
| 01  | [System Overview](./01-system-overview.md)         | Principles, high-level architecture, scale posture |
| 02  | [Database Design](./02-database-design.md)         | Collections, fields, indexes, ERD                  |
| 03  | [Module Architecture](./03-module-architecture.md) | Bounded contexts, layers, events                   |
| 04  | [API Design](./04-api-design.md)                   | REST contracts, auth rules, envelopes              |
| 05  | [RBAC](./05-rbac.md)                               | Roles, permissions, matrix                         |
| 06  | [Payment Flow](./06-payment-flow.md)               | PayHere, Koko, Mintpay, COD, failures              |
| 07  | [Order Flow](./07-order-flow.md)                   | Lifecycle state machine                            |
| 08  | [Security](./08-security.md)                       | JWT, sessions, hardening                           |
| 09  | [Folder Guidelines](./09-folder-guidelines.md)     | API structure rules                                |
| 10  | [Development Roadmap](./10-development-roadmap.md) | Phased build order                                 |

### Production operations

| Document                                            | Contents                    |
| --------------------------------------------------- | --------------------------- |
| [Production Deployment](./production-deployment.md) | Build, Docker, env, rollout |
| [Production Checklist](./production-checklist.md)   | Pre-go-live sign-off        |
| [Runbook](./runbook.md)                             | Incident response           |
| [Monitoring](./monitoring.md)                       | Logs, metrics, alerts       |
| [Backup & DR](./backup-disaster-recovery.md)        | Recovery procedures         |

### Phase implementation notes

### Legacy notes

- [ARCHITECTURE.md](./ARCHITECTURE.md) — short early sketch (superseded by 01–03)
- [MODELS.md](./MODELS.md) — early collection list (superseded by 02)

**Next step after approval:** Phase 1 platform core per roadmap — still no storefront pages or auth productization until scheduled phases.
